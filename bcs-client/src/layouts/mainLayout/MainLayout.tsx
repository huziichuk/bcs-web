import { Outlet } from 'react-router-dom'
import Footer from '../../widgets/footer/Footer'
import Header from '../../widgets/header/Header'
import styles from './MainLayout.module.css'

const MainLayout: React.FC = () => {
	return (
		<div className={styles.container}>
			<Header />
			<main className={styles.main}>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}

export default MainLayout
