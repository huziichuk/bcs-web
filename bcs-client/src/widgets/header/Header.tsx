import { Shield } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { pageConfig } from '../../pageConfig'
import styles from './Header.module.css'

const Header: React.FC = () => {
	return (
		<header className={styles.header}>
			<div className={styles.headerContent}>
				<NavLink to={pageConfig.homeUrl}>
					<div className={styles.logo}>
						<Shield className={styles.logoIcon} />
						<span className={styles.logoText}>BCS SYSTEM</span>
					</div>
				</NavLink>
				<div className={styles.badge}>DEMO VERSION</div>
			</div>
		</header>
	)
}

export default Header
