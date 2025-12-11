import { ArrowRight, Plus } from 'lucide-react'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pageConfig } from '../../pageConfig'
import styles from './SessionLauncher.module.css'

const SessionLauncher = () => {
	const [sessionId, setSessionId] = useState('')
	const [mode, setMode] = useState<'select' | 'join'>('select')

	const navigate = useNavigate()

	const handleJoin = () => {
		if (sessionId.trim()) {
			navigate(pageConfig.getActiveSessionUrl(sessionId))
		}
	}

	return (
		<>
			<div className={styles.container}>
				<div className={styles.card}>
					{mode === 'select' ? (
						<div className={styles.modeSelect}>
							<button
								className={styles.modeButton}
								onClick={() => {
									navigate(pageConfig.createSessionUrl)
								}}
							>
								<div className={styles.modeIcon}>
									<Plus className={styles.icon} />
								</div>
								<div className={styles.modeContent}>
									<h3 className={styles.modeTitle}>Create New Session</h3>
									<p className={styles.modeDescription}>
										Initialize a new tactical session with custom parameters
									</p>
								</div>
							</button>

							<button
								className={styles.modeButton}
								onClick={() => setMode('join')}
							>
								<div className={styles.modeIcon}>
									<ArrowRight className={styles.icon} />
								</div>
								<div className={styles.modeContent}>
									<h3 className={styles.modeTitle}>Join Existing Session</h3>
									<p className={styles.modeDescription}>
										Connect to an active tactical session using session ID
									</p>
								</div>
							</button>
						</div>
					) : (
						<div className={styles.joinForm}>
							<label className={styles.label}>
								SESSION ID
								<input
									type='text'
									className={styles.input}
									placeholder='Enter session ID...'
									value={sessionId}
									onChange={e => setSessionId(e.target.value)}
									onKeyPress={e => e.key === 'Enter' && handleJoin()}
								/>
							</label>

							<div className={styles.buttonGroup}>
								<button
									className={styles.secondaryButton}
									onClick={() => setMode('select')}
								>
									BACK
								</button>
								<button
									className={styles.primaryButton}
									onClick={handleJoin}
									disabled={!sessionId.trim()}
								>
									CONNECT
									<ArrowRight className={styles.buttonIcon} />
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export default SessionLauncher
