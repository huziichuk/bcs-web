import os, asyncio, json, time, cv2
from typing import Dict, Set
import websockets
from fractions import Fraction
from av import VideoFrame
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack, RTCConfiguration, RTCIceServer
from deepsort_2 import Tracker

HOST_WS = os.getenv("HOST_WS", "ws://localhost:8000/worker")
#HOST_WS = os.getenv("HOST_WS", "wss://api.bcs-web.online/worker")
WORKER_ID = os.getenv("WORKER_ID", f"w-{int(time.time())}")
VIDEOS_DIR = os.path.join(os.getcwd(), "videos")

print("STARTING...")

ICE_CONFIG = RTCConfiguration(
    iceServers=[
        RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
        RTCIceServer(
            urls=["turn:turn.bcs-web.online:3478?transport=udp"],
            username="webrtc_user",
            credential="webrtc_password",
        ),
    ]
)



class CaptureVideoTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self, capture: Tracker, size=None):
        super().__init__()
        self.capture = capture
        self.size = size
        self._pts = 0
        self._tb = Fraction(1, 90000)

    async def recv(self):
        if getattr(self.capture, "ended", lambda: False)():
            vf = VideoFrame(width=640, height=360, format="bgr24")
            vf.pts = 0
            vf.time_base = self._tb
            await asyncio.sleep(0)
            return vf

        while getattr(self.capture, "last", None) is None and not getattr(
            self.capture, "ended", lambda: False
        )():
            await asyncio.sleep(0.005)

        if getattr(self.capture, "last", None) is None and getattr(
            self.capture, "ended", lambda: False
        )():
            vf = VideoFrame(width=640, height=360, format="bgr24")
        else:
            frame = self.capture.last
            if self.size:
                frame = cv2.resize(frame, self.size)
            vf = VideoFrame.from_ndarray(frame, format="bgr24")

        frame_dt = max(getattr(self.capture, "frame_dt", 1 / 30), 1 / 120)
        step = int(90000 * frame_dt)
        self._pts += max(step, 1)
        vf.pts = self._pts
        vf.time_base = self._tb
        await asyncio.sleep(0)
        return vf

captures: Dict[str, Tracker] = {}
pending_stop: Set[str] = set()


async def get_or_create_capture(
    session_id: str, filename: str, ammunition: Dict
) -> Tracker:
    cap = captures.get(session_id)
    if cap is None:
        path = os.path.join(VIDEOS_DIR, filename)
        cap = Tracker(path, weapons=ammunition)
        captures[session_id] = cap
        await cap.start()
        if session_id in pending_stop:
            try:
                cap._ended = True
            except Exception:
                pass
            pending_stop.discard(session_id)
    return cap


async def wait_ice_gathering_complete(pc: RTCPeerConnection):
    if pc.iceGatheringState == "complete":
        return
    fut = asyncio.get_event_loop().create_future()

    @pc.on("icegatheringstatechange")
    def _on_ice():
        if pc.iceGatheringState == "complete" and not fut.done():
            fut.set_result(True)

    await fut


async def stream_logs_dc(channel, cap: Tracker):
    while not getattr(cap, "_ended", False) and channel.readyState == "open":
        logs = getattr(cap, "logs", {})
        try:
            channel.send(
                json.dumps(
                    {
                        "type": "logs",
                        "logs": logs,
                    }
                )
            )
        except Exception:
            break
        await asyncio.sleep(0.2)
async def handle_offer(
    ws,
    job_id: str,
    session_id: str,
    filename: str,
    payload: Dict,
    ammunition: Dict,
):
    pc = RTCPeerConnection(configuration=ICE_CONFIG)
    try:
        print("await")
        await pc.setRemoteDescription(
            RTCSessionDescription(payload["sdp"], payload["type"])
        )
        print("stop await")

        cap = await get_or_create_capture(session_id, filename, ammunition)
        pc.addTrack(CaptureVideoTrack(cap, size=(1280, 720)))

        @pc.on("datachannel")
        def on_datachannel(channel):
            print("DataChannel created:", channel.label)
            if channel.label == "logs":
                asyncio.create_task(stream_logs_dc(channel, cap))


        answer = await pc.createAnswer()
        print("PC ", pc)
        print("ANSWER ", answer)
        await pc.setLocalDescription(answer)
        await wait_ice_gathering_complete(pc)

        print(f"Session {session_id} started with job {job_id}")
        await ws.send(
            json.dumps(
                {"type": "answer", "job_id": job_id, "sdp": pc.localDescription.sdp}
            )
        )

        done = asyncio.Event()

        @pc.on("iceconnectionstatechange")
        def on_ice_state_change():
            print("ICE state:", pc.iceConnectionState)


        @pc.on("connectionstatechange")
        def _on_state():
            print("ICE state:", pc.iceConnectionState)
            if pc.connectionState in ("failed", "closed", "disconnected"):
                done.set()

        async def _watch_end():
            while not getattr(cap, "_ended", False):
                await asyncio.sleep(0.3)
            try:
                await pc.close()
            except Exception:
                pass
            done.set()

        asyncio.create_task(_watch_end())
        await done.wait()
    finally:
        try:
            await ws.send(
                json.dumps(
                    {
                        "type": "done",
                        "job_id": job_id,
                        "session_id": session_id,
                    }
                )
            )
        except Exception:
            pass
        try:
            await pc.close()
        except Exception:
            pass

async def run_worker():
    while True:
        try:
            async with websockets.connect(HOST_WS, max_size=None) as ws:
                await ws.send(
                    json.dumps({"type": "hello", "worker_id": WORKER_ID})
                )
                try:
                    _ = await asyncio.wait_for(ws.recv(), timeout=5)
                except Exception:
                    pass
                try:
                    while True:
                        msg = json.loads(await ws.recv())
                        t = msg.get("type")
                        if t == "offer":
                            asyncio.create_task(
                                handle_offer(
                                    ws,
                                    msg["job_id"],
                                    msg["session_id"],
                                    msg["filename"],
                                    msg["payload"],
                                    msg["ammunition"],
                                )
                            )
                        elif t == "stop":
                            print("Received stop command")
                            sid = msg.get("session_id")
                            print("Stopping session:", sid)
                            cap = captures.get(sid)
                            try:
                                if cap is not None:
                                    setattr(cap, "_ended", True)
                                    print("Set _ended for capture")
                            except Exception:
                                pass
                finally:
                    for sid, cap in list(captures.items()):
                        try:
                            setattr(cap, "_ended", True)
                        except Exception:
                            pass
                        captures.pop(sid, None)
        except Exception:
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(run_worker())
