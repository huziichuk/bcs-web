import { Activity, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetOffer } from '../../api/bcsApi'
import QueueScreen from '../../widgets/queueScreen/QueueScreen'
import styles from './ActiveSession.module.css'

type QueueHandle = {
	doneAnswer: Promise<{ sdp: string }>
	close: () => void
	jobId: string
}

type DetectionStats = {
	apc: number
	tanks: number
	ifv: number
	total: number
}

type logs = {
	total_amount: number
	amount: {
		tanks: number
		ifv: number
		apc: number
	}
	actions: {
		moving_forward: number
		from_left_flank: number
		from_right_flank: number
		moving_back: number
	}
	tactic: string
	command: string
	priority: string
}

type QueueEvent =
	| { type: 'queue_position'; position: number }
	| { type: 'assigned'; worker_id: string }
	| { type: 'answer'; sdp: string }
	| { type: 'error'; reason: string }
	| { type: 'done' }
	| {
			type: 'logs'
			logs: logs
	  }

interface Decision {
	id: number
	timestamp: string
	action: string
	status: 'approved' | 'rejected' | 'pending'
}

function openQueue(
	jobId: string,
	onEvent: (e: QueueEvent) => void
): QueueHandle {
	let closed = false
	let ws: WebSocket | null = null
	let pingTimer: number | undefined
	let answerResolved = false

	const doneAnswer = new Promise<{ sdp: string }>((resolve, reject) => {
		const connect = () => {
			if (closed) return
			const wssApiLink =
				import.meta.env.VITE_API_WSS_URL || 'wss://localhost:8000'
			ws = new WebSocket(`${wssApiLink}/queue/${jobId}`)
			ws.onopen = () => {
				pingTimer = window.setInterval(() => {
					try {
						ws?.send('ping')
					} catch {
						/* empty */
					}
				}, 15000)
			}

			ws.onmessage = e => {
				try {
					const msg = JSON.parse(e.data) as QueueEvent
					onEvent(msg)

					if (msg.type === 'answer' && !answerResolved) {
						answerResolved = true
						resolve({ sdp: msg.sdp })
					}
					if (msg.type === 'done') {
						closeWS()
					}

					if (msg.type === 'error') {
						reject(new Error(msg.reason))
						closeWS()
					}
				} catch {
					// empty
				}
			}

			ws.onclose = () => {
				if (pingTimer !== undefined) {
					clearInterval(pingTimer)
					pingTimer = undefined
				}
				if (!closed && !answerResolved) {
					setTimeout(connect, 400)
				}
			}

			ws.onerror = () => {
				try {
					ws?.close()
				} catch {
					/* empty */
				}
			}
		}
		connect()
	})

	const closeWS = () => {
		closed = true
		if (pingTimer !== undefined) {
			clearInterval(pingTimer)
			pingTimer = undefined
		}
		try {
			ws?.close()
		} catch {
			/* empty */
		}
	}

	return { doneAnswer, close: closeWS, jobId }
}

function waitIceComplete(pc: RTCPeerConnection, timeoutMs = 5000) {
	return new Promise<void>(resolve => {
		if (pc.iceGatheringState === 'complete') return resolve()

		const done = () => {
			pc.removeEventListener('icegatheringstatechange', onStateChange)
			resolve()
		}

		const onStateChange = () => {
			if (pc.iceGatheringState === 'complete') {
				done()
			}
		}

		pc.addEventListener('icegatheringstatechange', onStateChange)

		setTimeout(done, timeoutMs)
	})
}

async function startWebRTC(
	videoEl: HTMLVideoElement,
	sid: string,
	onEvent: (e: QueueEvent) => void
) {
	const pc = new RTCPeerConnection({
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' },
			{
				urls: ['turn:turn.bcs-web.online:3478?transport=udp'],
				username: 'webrtc_user',
				credential: 'webrtc_password',
			},
		],
		iceTransportPolicy: 'relay',
	})

	const logChannel = pc.createDataChannel('logs')

	logChannel.onopen = () => {
		console.log('logs channel opened')
	}

	logChannel.onmessage = ev => {
		try {
			const data = JSON.parse(ev.data) as { type: 'logs'; logs: logs }
			if (data.type === 'logs' && data.logs) {
				onEvent(data)
			}
			console.log(data)
		} catch (err) {
			console.error('Failed to parse logs message', err)
		}
	}

	pc.ondatachannel = ev => {
		if (ev.channel.label === 'logs') {
			const ch = ev.channel
			ch.onmessage = logChannel.onmessage
		}
	}

	pc.ontrack = ev => {
		videoEl.srcObject = ev.streams[0]
	}

	pc.addTransceiver('video', { direction: 'recvonly' })

	const offer = await pc.createOffer({ offerToReceiveVideo: true })
	await pc.setLocalDescription(offer)
	await waitIceComplete(pc)

	const { data } = await apiGetOffer(sid, {
		sdp: pc.localDescription!.sdp,
		type: pc.localDescription!.type,
	})

	const queue = openQueue(data.job_id, onEvent)
	const { sdp } = await queue.doneAnswer
	await pc.setRemoteDescription({ type: 'answer', sdp })

	return { pc, jobId: data.job_id, queue }
}

const ActiveSession = () => {
	const videoRef = useRef<HTMLVideoElement>(null)
	const [detectionLogs, setDetectionLogs] = useState<DetectionStats>({
		ifv: 0,
		tanks: 0,
		apc: 0,
		total: 0,
	})
	const [decisions] = useState<Decision[]>([])
	const [loading, setLoading] = useState(true)
	const [queuePos, setQueuePos] = useState<number | null>(null)
	const [logs, setLogs] = useState<logs[]>([])

	const { sessionId } = useParams()

	useEffect(() => {
		if (!sessionId || !videoRef.current) return

		let cancelled = false
		let localPc: RTCPeerConnection | null = null
		let localQueue: QueueHandle | null = null

		const run = async () => {
			console.log('Starting WebRTC for session', sessionId)
			try {
				setLoading(true)
				setQueuePos(null)

				const { pc: newPc, queue } = await startWebRTC(
					videoRef.current!,
					sessionId,
					ev => {
						if (ev.type === 'queue_position') setQueuePos(ev.position + 1)
						if (ev.type === 'assigned') {
							setQueuePos(0)
						}

						if (ev.type === 'logs' && ev.logs !== undefined) {
							setLogs(prev => [...prev, ev.logs])
							setDetectionLogs({
								tanks: ev.logs.amount.tanks,
								apc: ev.logs.amount.apc,
								ifv: ev.logs.amount.ifv,
								total:
									ev.logs.amount.tanks +
									ev.logs.amount.apc +
									ev.logs.amount.ifv,
							})
						}
					}
				)

				if (cancelled) {
					try {
						newPc.close()
					} catch {
						/* empty */
					}
					try {
						queue.close()
					} catch {
						/* empty */
					}
					return
				}

				localPc = newPc
				localQueue = queue

				newPc.onconnectionstatechange = () => {
					const st = newPc.connectionState
					if (st === 'failed' || st === 'closed' || st === 'disconnected') {
						queue.close()
					}
				}

				const onUnload = () => {
					try {
						newPc.close()
					} catch {
						/* empty */
					}
					try {
						queue.close()
					} catch {
						/* empty */
					}
				}

				window.addEventListener('beforeunload', onUnload)
				window.addEventListener('pagehide', onUnload)

				return () => {
					window.removeEventListener('beforeunload', onUnload)
					window.removeEventListener('pagehide', onUnload)
				}
			} catch {
				// empty
			} finally {
				console.log('WebRTC setup finished')
				setLoading(false)
			}
		}

		let removeUnloadListeners: (() => void) | void
		run().then(fn => {
			removeUnloadListeners = fn
		})

		return () => {
			cancelled = true

			if (removeUnloadListeners) {
				removeUnloadListeners()
			}

			if (localPc) {
				try {
					localPc.close()
				} catch {
					/* empty */
				}
				localPc = null
			}
			if (localQueue) {
				try {
					localQueue.close()
				} catch {
					/* empty */
				}
				localQueue = null
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId])

	return (
		<div className={[styles.container, loading ? styles.hidden : ''].join(' ')}>
			{loading ? <QueueScreen queuePosition={queuePos} /> : null}
			<div className={styles.sessionHeader}>
				<div className={styles.sessionInfo}>
					<h2 className={styles.sessionTitle}>SESSION: {sessionId}</h2>
					<div className={styles.statusIndicator}>
						<div className={styles.statusDot}></div>
						<span className={styles.statusText}>ACTIVE</span>
					</div>
				</div>

				<div className={styles.resourceBar}>
					<div className={styles.resourceItem}>
						<span className={styles.resourceLabel}>MISSILES</span>
						<span className={styles.resourceValue}>None</span>
					</div>
					<div className={styles.resourceItem}>
						<span className={styles.resourceLabel}>DRONES</span>
						<span className={styles.resourceValue}>none</span>
					</div>
					<div className={styles.resourceItem}>
						<span className={styles.resourceLabel}>SURVEILLANCE</span>
						<span className={styles.resourceValue}>none</span>
					</div>
					<div className={styles.resourceItem}>
						<span className={styles.resourceLabel}>AMMO</span>
						<span className={styles.resourceValue}>none</span>
					</div>
				</div>
			</div>
			<div className={styles.topRow}>
				<div className={styles.videoSection}>
					<div className={styles.sectionHeader}>
						<Activity className={styles.sectionIcon} />
						<h3 className={styles.sectionTitle}>VIDEO FEED</h3>
					</div>
					<div className={styles.videoWrapper}>
						<video
							ref={videoRef}
							className={styles.video}
							autoPlay
							muted
							loop
							playsInline
						>
							Your browser does not support the video tag.
						</video>
					</div>
				</div>

				<div className={styles.logsSection}>
					<div className={styles.sectionHeader}>
						<Activity className={styles.sectionIcon} />
						<h3 className={styles.sectionTitle}>DETECTION LOGS</h3>
					</div>
					<div className={styles.logsContent}>
						{detectionLogs.total === 0 ? (
							<div className={styles.emptyState}>Waiting for detections...</div>
						) : (
							logs.map((log, i) => (
								<div key={i} className={styles.logItem}>
									<div className={styles.logHeader}>
										<span className={styles.logType}>Detected</span>
										<span className={styles.logTime}>
											{new Date().toLocaleDateString('en-GB', {
												day: '2-digit',
												month: 'long',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</div>

									<div className={styles.logDetails}>
										<div className={styles.logConfidence}>
											Tactic: {log.tactic}
										</div>
										<div className={styles.logConfidence}>
											Command: {log.command}
										</div>
										<div className={styles.logConfidence}>
											Priority target: {log.priority}
										</div>
										<div className={styles.logConfidence}>
											Total amount: {log.total_amount}
										</div>
										<div className={styles.logPosition}>Amount:</div>
										<div className={styles.logConfidence}>
											Tanks: {log.amount.tanks}
										</div>
										<div className={styles.logConfidence}>
											Apcs: {log.amount.apc}
										</div>
										<div className={styles.logConfidence}>
											Ifvs: {log.amount.ifv}
										</div>
										<div className={styles.logPosition}>Actions:</div>
										<div className={styles.logConfidence}>
											Moving forward: {log.actions.moving_forward}
										</div>
										<div className={styles.logConfidence}>
											Moving back: {log.actions.moving_back}
										</div>
										<div className={styles.logConfidence}>
											From left flank: {log.actions.from_left_flank}
										</div>
										<div className={styles.logConfidence}>
											From right flank: {log.actions.from_right_flank}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
			<div className={styles.bottomRow}>
				<div className={styles.chartsSection}>
					<div className={styles.sectionHeader}>
						<Activity className={styles.sectionIcon} />
						<h3 className={styles.sectionTitle}>ANALYTICS</h3>
					</div>
					<div className={styles.chartsContent}>
						<div className={styles.statsGrid}>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>TANKS DETECTED</div>
								<div className={styles.statValue}>{detectionLogs.tanks}</div>
							</div>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>APCs DETECTED</div>
								<div className={styles.statValue}>{detectionLogs.apc}</div>
							</div>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>IFVs DETECTED</div>
								<div className={styles.statValue}>{detectionLogs.ifv}</div>
							</div>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>TOTAL THREATS</div>
								<div className={styles.statValue}>{detectionLogs.total}</div>
							</div>
						</div>

						<div className={styles.chartContainer}>
							<div className={styles.chartTitle}>THREAT DISTRIBUTION</div>
							<div className={styles.barChart}>
								<div className={styles.barItem}>
									<div className={styles.barLabel}>TANKS</div>
									<div className={styles.barWrapper}>
										<div
											className={styles.barFill}
											style={{
												width: `${
													(detectionLogs.tanks /
														Math.max(
															detectionLogs.tanks +
																detectionLogs.apc +
																detectionLogs.ifv,
															1
														)) *
													100
												}%`,
											}}
										></div>
									</div>
									<div className={styles.barValue}>{detectionLogs.tanks}</div>
								</div>
								<div className={styles.barItem}>
									<div className={styles.barLabel}>APCs</div>
									<div className={styles.barWrapper}>
										<div
											className={styles.barFill}
											style={{
												width: `${
													(detectionLogs.apc /
														Math.max(
															detectionLogs.tanks +
																detectionLogs.apc +
																detectionLogs.ifv,
															1
														)) *
													100
												}%`,
											}}
										></div>
									</div>
									<div className={styles.barValue}>{detectionLogs.apc}</div>
								</div>
								<div className={styles.barItem}>
									<div className={styles.barLabel}>IFVs</div>
									<div className={styles.barWrapper}>
										<div
											className={styles.barFill}
											style={{
												width: `${
													(detectionLogs.ifv /
														Math.max(
															detectionLogs.tanks +
																detectionLogs.apc +
																detectionLogs.ifv,
															1
														)) *
													100
												}%`,
											}}
										></div>
									</div>
									<div className={styles.barValue}>{detectionLogs.ifv}</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.decisionsSection}>
					<div className={styles.sectionHeader}>
						<Activity className={styles.sectionIcon} />
						<h3 className={styles.sectionTitle}>TACTICAL DECISIONS</h3>
					</div>
					<div className={styles.decisionsContent}>
						{decisions.length === 0 ? (
							<div className={styles.emptyState}>No decisions yet...</div>
						) : (
							decisions.map(decision => (
								<div key={decision.id} className={styles.decisionItem}>
									<div className={styles.decisionHeader}>
										<span className={styles.decisionTime}>
											{decision.timestamp}
										</span>
										<div
											className={`${styles.decisionStatus} ${
												styles[decision.status]
											}`}
										>
											{decision.status === 'approved' && (
												<CheckCircle className={styles.statusIcon} />
											)}
											{decision.status === 'rejected' && (
												<XCircle className={styles.statusIcon} />
											)}
											{decision.status === 'pending' && (
												<AlertCircle className={styles.statusIcon} />
											)}
											{decision.status.toUpperCase()}
										</div>
									</div>
									<div className={styles.decisionAction}>{decision.action}</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default ActiveSession
