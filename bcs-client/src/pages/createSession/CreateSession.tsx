import { AxiosError } from 'axios'
import { ArrowLeft, Radio, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { apiCreateSession, apiGetVideos } from '../../api/bcsApi'
import { pageConfig } from '../../pageConfig'
import type { Ammunition } from '../../types/types'
import styles from './CreateSession.module.css'

const SessionCreator = () => {
	const getRandomInt = () => {
		return Math.floor(Math.random() * 100) + 1
	}

	const [customId, setCustomId] = useState('')
	const [ATGM, setATGM] = useState(getRandomInt())
	const [FPVDrones, setFPVDrones] = useState(getRandomInt())
	const [clusterShells, setClusterShells] = useState(getRandomInt())
	const [unitaryShells, setUnitaryShells] = useState(getRandomInt())
	const [videoFiles, setVideoFiles] = useState<string[]>([])
	const [videoFile, setVideoFile] = useState('')
	const [error, setError] = useState('')

	const navigate = useNavigate()

	useEffect(() => {
		apiGetVideos().then(res => {
			setVideoFiles(res.data.videos)
		})
	}, [])

	const handleCreate = () => {
		setError('')
		if (!videoFile) {
			setError('Please select a video file.')
			return
		}
		const ammunition: Ammunition = {
			atgm: ATGM,
			cluster_shells: clusterShells,
			unitary_shells: unitaryShells,
			fpv_drones: FPVDrones,
		}
		apiCreateSession({
			ammunition,
			filename: videoFile,
			custom_id: customId,
		})
			.then(res => {
				navigate(pageConfig.getActiveSessionUrl(res.data.session_id))
			})
			.catch(err => {
				if (err instanceof AxiosError) {
					const code = err.response?.status
					if (code) {
						setError(code.toString())
						return
					}
				}
				setError(err.response?.data?.detail || 'Failed to create session.')
			})
	}

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<button className={styles.backButton} onClick={() => navigate(-1)}>
					<ArrowLeft className={styles.backIcon} />
				</button>
				<div>
					<h2 className={styles.title}>CREATE SESSION</h2>
					<p className={styles.subtitle}>Configure tactical parameters</p>
				</div>
			</div>

			<div className={styles.form}>
				{error === '503' ? (
					<>
						<div className={styles.form__text}>
							Sorry, but no workers are currently connected. However, you can
							become one yourself by running a worker on your own PC.
						</div>
						<NavLink
							className={styles.createButton}
							to={pageConfig.becomeWorker}
						>
							How do I become a worker?
						</NavLink>
					</>
				) : (
					error && <div className={styles.error}>{error}</div>
				)}
				<div className={styles.section}>
					<label className={styles.label}>
						VIDEO FILE
						<select
							className={styles.select}
							value={videoFile}
							onChange={e => {
								setVideoFile(e.target.value)
							}}
						>
							<option disabled className={styles.option} value=''>
								Select Video File
							</option>
							{videoFiles.map(file => (
								<option key={file} className={styles.option} value={file}>
									{file}
								</option>
							))}
						</select>
					</label>
				</div>

				<div className={styles.section}>
					<label className={styles.label}>
						CUSTOM SESSION ID (OPTIONAL)
						<input
							type='text'
							className={styles.input}
							placeholder='Auto-generated if empty...'
							value={customId}
							onChange={e => setCustomId(e.target.value)}
						/>
						<span className={styles.hint}>
							Leave empty for auto-generated ID
						</span>
					</label>
				</div>

				<div className={styles.section}>
					<h3 className={styles.sectionTitle}>
						<Rocket className={styles.sectionIcon} />
						AMMUNITION ALLOCATION
					</h3>

					<div className={styles.inputGrid}>
						<label className={styles.label}>
							ATMG
							<input
								type='number'
								className={styles.numberInput}
								value={ATGM}
								onChange={e => setATGM(Number(e.target.value))}
								min='0'
								max='100'
							/>
						</label>

						<label className={styles.label}>
							CLUSTER SHELLS
							<input
								type='number'
								className={styles.numberInput}
								value={clusterShells}
								onChange={e => setClusterShells(Number(e.target.value))}
								min='0'
								max='100'
							/>
						</label>

						<label className={styles.label}>
							UNITARY SHELLS
							<input
								type='number'
								className={styles.numberInput}
								value={unitaryShells}
								onChange={e => setUnitaryShells(Number(e.target.value))}
								min='0'
								max='100'
							/>
						</label>

						<label className={styles.label}>
							FPV DRONES
							<input
								type='number'
								className={styles.numberInput}
								value={FPVDrones}
								onChange={e => setFPVDrones(Number(e.target.value))}
								min='0'
								max='1000'
								step='50'
							/>
						</label>
					</div>
				</div>

				<div className={styles.summary}>
					<div className={styles.summaryTitle}>
						<Radio className={styles.sectionIcon} />
						SESSION SUMMARY
					</div>
					<div className={styles.summaryGrid}>
						<div className={styles.summaryItem}>
							<span className={styles.summaryLabel}>ATGM:</span>
							<span className={styles.summaryValue}>{ATGM}</span>
						</div>
						<div className={styles.summaryItem}>
							<span className={styles.summaryLabel}>FPV drones:</span>
							<span className={styles.summaryValue}>{FPVDrones}</span>
						</div>
						<div className={styles.summaryItem}>
							<span className={styles.summaryLabel}>Cluster shells:</span>
							<span className={styles.summaryValue}>{clusterShells}</span>
						</div>
						<div className={styles.summaryItem}>
							<span className={styles.summaryLabel}>Unitary shells:</span>
							<span className={styles.summaryValue}>{unitaryShells}</span>
						</div>
					</div>
				</div>

				<button className={styles.createButton} onClick={handleCreate}>
					<Rocket className={styles.buttonIcon} />
					CREATE SESSION
				</button>
			</div>
		</div>
	)
}

export default SessionCreator
