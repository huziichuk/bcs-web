import { AlertTriangle, Crosshair, Github } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { pageConfig } from '../../pageConfig'
import styles from './Home.module.css'

const Home = () => {
	const navigate = useNavigate()

	return (
		<>
			<div className={styles.main}>
				<div className={styles.mainContent}>
					<div className={styles.hero}>
						<div className={styles.iconWrapper}>
							<div className={styles.iconContainer}>
								<div className={styles.iconGlow}></div>
								<Crosshair className={styles.heroIcon} strokeWidth={1.5} />
							</div>
						</div>

						<h1 className={styles.title}>BCS</h1>
						<p className={styles.subtitle}>Battle Control System</p>
						<p className={styles.description}>
							Advanced neural network system designed for real-time detection
							and classification of military vehicles in battlefield
							environments. The system can detect and identify
							<strong> Tanks</strong>,{' '}
							<strong>Armored Personnel Carriers (APCs)</strong>, and{' '}
							<strong>Infantry Fighting Vehicles (IFVs)</strong>. Utilizing
							state-of-the-art computer vision algorithms to provide tactical
							intelligence and making optimal decisions for target elimination.
						</p>

						<div className={styles.capabilities}>
							<h2 className={styles.capabilitiesTitle}>System Capabilities</h2>
							<div className={styles.capabilitiesGrid}>
								<div className={styles.capabilityCard}>
									<p className={styles.capabilityTitle}>Real-time Detection</p>
									<p className={styles.capabilityDescription}>
										Instant identification in video feeds
									</p>
								</div>
								<div className={styles.capabilityCard}>
									<p className={styles.capabilityTitle}>High Accuracy</p>
									<p className={styles.capabilityDescription}>
										Advanced neural network classification
									</p>
								</div>
								<div className={styles.capabilityCard}>
									<p className={styles.capabilityTitle}>Tactical Analysis</p>
									<p className={styles.capabilityDescription}>
										Comprehensive threat assessment
									</p>
								</div>
							</div>
						</div>

						<button
							className={styles.launchButton}
							onClick={() => {
								navigate(pageConfig.sessionLauncherUrl)
							}}
						>
							<Crosshair className={styles.buttonIcon} />
							LAUNCH SYSTEM
						</button>
					</div>

					<div className={styles.alert}>
						<AlertTriangle className={styles.alertIcon} />
						<div className={styles.alertContent}>
							<strong>Warning:</strong> This is a demonstration system. Results
							are for testing purposes only and should not be used for actual
							military operations.
						</div>
					</div>
				</div>
				<NavLink to={pageConfig.becomeWorker} className={styles.heroButton}>
					How to become a worker
				</NavLink>
			</div>

			<div className={styles.info}>
				<div className={styles.infoContent}>
					<div className={styles.infoInner}>
						{/* Technologies Section */}
						<div className={styles.technologiesSection}>
							<h3 className={styles.technologiesTitle}>Technologies Used</h3>
							<div className={styles.technologiesGrid}>
								<div className={styles.techBlock}>
									<div className={styles.techBlockTitle}>NEURAL NETWORK</div>
									<ul className={styles.techList}>
										<li>
											YOLOv12 model trained on military vehicle datasets for
											object detection
										</li>
										<li>
											Custom LSTM model on custom data for tactical pattern
											recognition
										</li>
										<li>
											RandomForest ML models for decision-making, trained
											following MLOps standards
										</li>
									</ul>
								</div>
								<div className={styles.techBlock}>
									<div className={styles.techBlockTitle}>WEB APPLICATION</div>
									<ul className={styles.techList}>
										<li>React TypeScript for frontend interface</li>
										<li>FastAPI backend infrastructure</li>
										<li>
											Worker pattern architecture for distributed processing
										</li>
										<li>WebRTC for real-time video streaming</li>
									</ul>
								</div>
							</div>
							<div className={styles.githubLinks}>
								<a
									href='https://github.com/Maks6666/bcs_ai'
									target='_blank'
									rel='noopener noreferrer'
									className={styles.githubLink}
								>
									<Github className={styles.githubIcon} />
									Neural Network Repository
								</a>
								<a
									href='https://github.com/huziichuk/bcs-web'
									target='_blank'
									rel='noopener noreferrer'
									className={styles.githubLink}
								>
									<Github className={styles.githubIcon} />
									Web Application Repository
								</a>
							</div>
							<div className={styles.teamNote}>
								Entirely developed by only two people
							</div>
						</div>

						<div className={styles.projectInfo}>
							<h3 className={styles.projectInfoTitle}>Project Information</h3>
							<div className={styles.projectInfoContent}>
								<p>
									This system was developed by{' '}
									<span className={styles.highlight}>Maks Kucher</span> and{' '}
									<span className={styles.highlight}>Nazar Huziichuk</span>
								</p>
								<p>
									Students at{' '}
									<span className={styles.highlight}>
										Turku University of Applied Sciences
									</span>
								</p>
								<p className={styles.projectInfoFooter}>
									Educational Project • Demo Version • Not for Production Use
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}

export default Home
