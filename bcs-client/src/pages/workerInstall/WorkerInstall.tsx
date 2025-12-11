import { ArrowUpRight } from 'lucide-react'
import styles from './WorkerInstall.module.css'

const WorkerInstall = () => {
	return (
		<div className={styles.container}>
			<div className={styles.card}>
				<h1 className={styles.title}>How do I run a worker on my PC?</h1>
				<h2 className={styles.desc}>
					To run a worker on your local machine, you need to have Docker
					installed and execute a few commands to download and start the
					container.
				</h2>
				<div className={styles.guide_container}>
					<div className={styles.guide__text}>
						You can download Docker from the official website.
					</div>
					<a
						href='https://docs.docker.com/desktop/setup/install/windows-install/'
						className={styles.button}
					>
						Docker <ArrowUpRight />
					</a>
					<div className={styles.guide__text}>
						Command to download the image:
					</div>
					<div className={styles.guide__command}>
						docker pull guziiuchyk/worker-gpu:latest
					</div>
					<div className={styles.guide__text}>
						Command to start the container:
					</div>
					<div className={styles.guide__command}>
						docker run --gpus all guziiuchyk/worker-gpu:latest
					</div>
				</div>
			</div>
		</div>
	)
}

export default WorkerInstall
