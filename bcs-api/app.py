import os, json, uuid, asyncio, time
from typing import Dict, Optional, Deque, Set, Literal
from dataclasses import dataclass, field
from collections import deque

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

VIDEOS = ["test_video_1.mp4","test_video_2.mp4","test_video_3.mp4","test_video_4.mp4","test_video_5.mp4","test_video_6.mp4","test_video_7.mp4"]
CORS = ["http://localhost:5173","https://bcs-web.online","https://www.bcs-web.online"]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateSessionReq(BaseModel):
    filename: str
    ammunition: Dict
    custom_id: Optional[str]
    
class OfferReq(BaseModel):
    sdp: str
    type: str

JobState = Literal["queued", "assigned", "answered", "stopping", "done"]

@dataclass
class Session:
    id: str
    filename: str
    ammunition: Dict[int, any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    def touch(self): self.last_activity = time.time()
    

@dataclass
class Worker:
    id: str
    ws: WebSocket
    current_session: Optional[str] = None   
    jobs_count: int = 0              
    connected_at: float = field(default_factory=time.time)

@dataclass
class WorkerJob:
    job_id: str
    session_id: str
    filename: str
    payload: Dict
    ammunition: Dict[int, any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    worker_id: Optional[str] = None
    inflight: bool = False
    state: JobState = "queued"

@dataclass
class QueueManager:
    jobs: Dict[str, WorkerJob] = field(default_factory=dict)       
    queue: Deque[str] = field(default_factory=deque)              
    workers: Dict[str, Worker] = field(default_factory=dict)       
    subs: Dict[str, Set[WebSocket]] = field(default_factory=dict)   
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    session_clients: Dict[str, int] = field(default_factory=dict)

    def _log_state(self, where="STATE"):
        print(
            f"[{where}] jobs={len(self.jobs)} "
            f"queue={list(self.queue)} "
            f"workers={len(self.workers)} "
            f"session_clients={self.session_clients} "
            f"workers_sessions={{"
            + ", ".join(
                f"{wid}:({w.current_session},{w.jobs_count})"
                for wid, w in self.workers.items()
            )
            + "}"
        )

    def queue_position(self, job_id: str) -> Optional[int]:
        try:
            return list(self.queue).index(job_id)
        except ValueError:
            return None

    async def notify_job(self, job_id: str, msg: dict):
        group = self.subs.get(job_id)
        if not group:
            return
        dead = []
        data = json.dumps(msg)
        for ws in group:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            group.discard(ws)
        if group and not len(group):
            self.subs.pop(job_id, None)

    async def broadcast_positions(self):
        for idx, jid in enumerate(self.queue):
            await self.notify_job(jid, {"type": "queue_position", "position": idx})

    async def enqueue(self, job: WorkerJob) -> int:
        async with self.lock:
            self.jobs[job.job_id] = job
            self.queue.append(job.job_id)
            print(f"[QUEUE] add job={job.job_id} session={job.session_id} file={job.filename}")
            self._log_state("ENQUEUE")
        await self.broadcast_positions()
        await self.assign_if_possible()
        pos = self.queue_position(job.job_id)
        return -1 if pos is None else pos

    async def assign_if_possible(self):
        while True:
            async with self.lock:
                if not self.workers or not self.queue:
                    break
                free_workers = [w for w in self.workers.values() if w.current_session is None]
                session_workers: Dict[str, Worker] = {}
                for w in self.workers.values():
                    if w.current_session is not None:
                        session_workers[w.current_session] = w

                jid = None
                job = None
                worker: Optional[Worker] = None

                for _ in range(len(self.queue)):
                    cand = self.queue.popleft()
                    j = self.jobs.get(cand)
                    if not j:
                        continue
                    if j.inflight or j.state in ("done", "stopping"):
                        continue

    
                    w_for_session = session_workers.get(j.session_id)
                    if w_for_session is not None:
                        worker = w_for_session
                    else:
                        worker = free_workers[0] if free_workers else None

                    if worker is None:
                        self.queue.append(cand)
                        continue

                    jid = cand
                    job = j
                    break

                if not jid or not job or worker is None:
                    break
                job.inflight = True
                job.worker_id = worker.id
                job.state = "assigned"
                worker.jobs_count += 1
                if worker.current_session is None:
                    worker.current_session = job.session_id

                assigned_worker_id = worker.id

            try:
                w = self.workers.get(assigned_worker_id)
                if not w:
                    async with self.lock:
                        j = self.jobs.get(job.job_id)
                        if j:
                            j.inflight = False
                            j.worker_id = None
                            j.state = "queued"
                            if job.job_id not in self.queue:
                                self.queue.appendleft(job.job_id)
                    continue

                await w.ws.send_text(json.dumps({
                    "type": "offer",
                    "job_id": job.job_id,
                    "session_id": job.session_id,
                    "filename": job.filename,
                    "ammunition": job.ammunition,
                    "payload": job.payload,
                }))
                await self.notify_job(job.job_id, {"type": "assigned", "worker_id": w.id})
                await self.notify_job(job.job_id, {"type": "queue_position", "position": -1})
            except Exception as e:
                print(f"[ASSIGN] send offer failed worker={assigned_worker_id}: {e}")
                async with self.lock:
                    w = self.workers.get(assigned_worker_id)
                    if w:
                        w.jobs_count = max(w.jobs_count - 1, 0)
                        if w.jobs_count == 0:
                            w.current_session = None
                    j = self.jobs.get(job.job_id)
                    if j:
                        j.inflight = False
                        j.worker_id = None
                        j.state = "queued"
                        if job.job_id not in self.queue:
                            self.queue.appendleft(job.job_id)
                continue

            self._log_state("ASSIGN_LOOP")

        await self.broadcast_positions()

    async def worker_answer(self, worker_id: str, job_id: str, sdp: str):
        print(f"[ANSWER] from worker={worker_id} job={job_id}")
        await self.notify_job(job_id, {"type": "answer", "sdp": sdp})
        async with self.lock:
            j = self.jobs.get(job_id)
            if j:
                j.state = "answered"
        self._log_state("ON_ANSWER")

    async def worker_done(self, worker_id: str, job_id: str, session_id: Optional[str]):
        print(f"[DONE] worker={worker_id} job={job_id} session={session_id}")
        await self.notify_job(job_id, {"type": "done"})
        async with self.lock:
            j = self.jobs.pop(job_id, None)
            if j:
                j.inflight = False
                j.state = "done"

            w = self.workers.get(worker_id)
            if w:
                if w.jobs_count > 0:
                    w.jobs_count -= 1
                if w.jobs_count == 0:
                    w.current_session = None

        self._log_state("ON_DONE")
        await self.assign_if_possible()

    async def worker_disconnected(self, worker_id: str):
        print(f"[WORKER] disconnected id={worker_id}")
        async with self.lock:
            w = self.workers.pop(worker_id, None)
            if not w:
                return

            for jid, job in list(self.jobs.items()):
                if job.worker_id == worker_id and job.state not in ("done", "stopping"):
                    await self.notify_job(jid, {"type": "error", "reason": "worker_disconnected"})
                    job.inflight = False
                    job.worker_id = None
                    job.state = "queued"
                    if jid not in self.queue:
                        self.queue.appendleft(jid)

        self._log_state("ON_WORKER_DISCONN")
        await self.broadcast_positions()
        await self.assign_if_possible()

    async def stop_job(self, job_id: str):
        async with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                print(f"[STOP] job not found id={job_id}")
                return

            if job.state == "queued" and job.worker_id is None and job_id in self.queue:
                self.queue.remove(job_id)
                self.jobs.pop(job_id, None)
                print(f"[STOP] removed queued job={job_id}")
                await self.broadcast_positions()
                self._log_state("STOP_QUEUED")
                return

            if job.state in ("stopping", "done"):
                print(f"[STOP] skip, state={job.state} job={job_id}")
                return

            job.state = "stopping"
            wid = job.worker_id
            worker = self.workers.get(wid) if wid else None

        if worker:
            try:
                await worker.ws.send_text(json.dumps({
                    "type": "stop",
                    "job_id": job_id,
                    "session_id": job.session_id
                }))
                print(f"[STOP] sent to worker={worker.id} for job={job_id}")
            except Exception as e:
                print(f"[STOP] failed to send to worker={worker.id}: {e}")

    async def stop_session(self, session_id: str):
        """
        Остановить все job'ы для данной сессии и послать stop воркеру (через stop_job).
        Вызывается, когда по session_id не осталось ни одного клиента.
        """
        async with self.lock:
            job_ids = [
                jid for jid, j in self.jobs.items()
                if j.session_id == session_id and j.state not in ("done", "stopping")
            ]
        for jid in job_ids:
            await self.stop_job(jid)

sessions: Dict[str, Session] = {}
qm = QueueManager()



@app.websocket("/worker")
async def worker_ws(ws: WebSocket):
    await ws.accept()
    worker_id = uuid.uuid4().hex
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=3)
        msg0 = json.loads(raw)
        if isinstance(msg0, dict) and msg0.get("type") == "hello" and "worker_id" in msg0:
            worker_id = msg0["worker_id"]
    except Exception:
        pass

    async with qm.lock:
        qm.workers[worker_id] = Worker(id=worker_id, ws=ws)
    print(f"[WORKER] connected id={worker_id}")
    try:
        await ws.send_text(json.dumps({"type": "hello_ack", "worker_id": worker_id}))
    except Exception:
        await qm.worker_disconnected(worker_id)
        return

    await qm.assign_if_possible()

    try:
        while True:
            msg = json.loads(await ws.receive_text())
            t = msg.get("type")
            if t == "answer":
                await qm.worker_answer(worker_id, msg["job_id"], msg["sdp"])
            elif t == "done":
                await qm.worker_done(worker_id, msg["job_id"], msg.get("session_id"))
            elif t == "busy":
                job_id = msg.get("job_id")
                async with qm.lock:
                    j = qm.jobs.get(job_id)
                    w = qm.workers.get(worker_id)
                    if j:
                        j.inflight = False
                        j.worker_id = None
                        j.state = "queued"
                        if job_id not in qm.queue:
                            qm.queue.appendleft(job_id)
                    if w:
                        if w.jobs_count > 0:
                            w.jobs_count -= 1
                        if w.jobs_count == 0:
                            w.current_session = None
                await qm.assign_if_possible()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WORKER] ws error {worker_id}: {e}")
    finally:
        await qm.worker_disconnected(worker_id)

@app.websocket("/queue/{job_id}")
async def queue_ws(ws: WebSocket, job_id: str):
    await ws.accept()

    async with qm.lock:
        job = qm.jobs.get(job_id)
        session_id = job.session_id if job else None

    if session_id is None:
        await ws.send_text(json.dumps({"type": "error", "reason": "unknown_job"}))
        await ws.close()
        return

    qm.subs.setdefault(job_id, set()).add(ws)

    async with qm.lock:
        qm.session_clients[session_id] = qm.session_clients.get(session_id, 0) + 1

    print(f"[WS] client connected job={job_id} session={session_id}")
    try:
        pos = qm.queue_position(job_id)
        await ws.send_text(json.dumps({
            "type": "queue_position",
            "position": -1 if pos is None else pos
        }))
        while True:
            _ = await ws.receive_text()  
    except WebSocketDisconnect:
        print(f"[WS] client disconnected job={job_id} session={session_id}")
    finally:
        group = qm.subs.get(job_id)
        if group:
            group.discard(ws)
            if not group:
                qm.subs.pop(job_id, None)

        need_stop_session = False
        async with qm.lock:
            if session_id in qm.session_clients:
                qm.session_clients[session_id] -= 1
                if qm.session_clients[session_id] <= 0:
                    qm.session_clients.pop(session_id, None)
                    need_stop_session = True

        if need_stop_session:
            await qm.stop_session(session_id)

        qm._log_state("WS_EXIT")

@app.on_event("startup")
async def _startup():
    print("[SYS] FastAPI started")

@app.get("/videos")
def get_videos():
    return {"videos": VIDEOS}

@app.post("/session")
def create_session(req: CreateSessionReq):
    files = VIDEOS
    if req.filename not in files:
        raise HTTPException(404, "file not found")
    if(len(qm.workers) == 0):
        raise HTTPException(503, "No workers connected")
    sid = req["custom_id"] or uuid.uuid4().hex
    sessions[sid] = Session(id=sid, filename=req.filename, ammunition=req.ammunition)
    print("request:", req)
    print(f"[SESSION] created sid={sid} file={req.filename}, ammunition={sessions[sid]}")
    return {"session_id": sid, "filename": req.filename}

@app.post("/session/{sid}/offer", status_code=202)
async def enqueue_offer(sid: str, payload: OfferReq = Body(...)):
    sess = sessions.get(sid)
    if not sess:
        raise HTTPException(404, "session not found")
    sess.touch()
    job_id = uuid.uuid4().hex
    job = WorkerJob(
        job_id=job_id,
        session_id=sid,
        filename=sess.filename,
        ammunition=sess.ammunition,
        payload={"sdp": payload.sdp, "type": payload.type},
    )
    pos = await qm.enqueue(job)
    print(f"[JOB] new job={job_id} session={sid} pos={pos}")
    return {"job_id": job_id, "position": pos}

@app.get("/health")
def health():
    print(
        f"[HEALTH] workers={len(qm.workers)} "
        f"queue={len(qm.queue)} jobs={len(qm.jobs)}"
    )
    return {
        "ok": True,
        "workers": len(qm.workers),
        "queue_length": len(qm.queue),
        "jobs_total": len(qm.jobs),
        "sessions": len(sessions),
        "videos": VIDEOS,
    }
