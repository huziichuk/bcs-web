import { Loader2, Users } from 'lucide-react'
import styles from './QueueScreen.module.css'

const QueueScreen = ({ queuePosition }: { queuePosition: number | null }) => {
	return (
		<div className={styles.container}>
			<div className={styles.card}>
				<div className={styles.iconWrapper}>
					<div className={styles.loaderContainer}>
						<Loader2 className={styles.loader} />
						<div className={styles.pulseRing}></div>
					</div>
				</div>

				{queuePosition && queuePosition > 0 ? (
					<>
						<h2 className={styles.title}>SESSION INITIALIZATION</h2>
						<p className={styles.subtitle}>Your session is being prepared...</p>

						<div className={styles.queueInfo}>
							<div className={styles.infoCard}>
								<Users className={styles.infoIcon} />
								<div className={styles.infoContent}>
									<div className={styles.infoLabel}>POSITION IN QUEUE</div>
									<div className={styles.infoValue}>{queuePosition}</div>
								</div>
							</div>
						</div>
					</>
				) : (
					<>
						<h2 className={styles.title}>SESSION READY</h2>
						<p className={styles.subtitle}>Launching tactical interface...</p>
						<div className={styles.readyIndicator}>
							<div className={styles.checkmark}>✓</div>
						</div>
					</>
				)}
			</div>
		</div>
	)
}

export default QueueScreen
