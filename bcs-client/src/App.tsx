import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/mainLayout/MainLayout.tsx'
import { pageConfig } from './pageConfig.ts'
import ActiveSession from './pages/activeSession/ActiveSession.tsx'
import SessionCreator from './pages/createSession/CreateSession.tsx'
import Home from './pages/home/Home.tsx'
import SessionLauncher from './pages/sessionLauncher/SessionLauncher.tsx'
import WorkerInstall from './pages/workerInstall/WorkerInstall.tsx'

const App: React.FC = () => {
	return (
		<Routes>
			<Route element={<MainLayout />}>
				<Route path={pageConfig.homeUrl} element={<Home />} />
				<Route
					path={pageConfig.sessionLauncherUrl}
					element={<SessionLauncher />}
				/>
				<Route
					path={pageConfig.createSessionUrl}
					element={<SessionCreator />}
				/>
				<Route
					path={pageConfig.activeSessionsUrl}
					element={<ActiveSession />}
				/>
				<Route path={pageConfig.becomeWorker} element={<WorkerInstall />} />
			</Route>
		</Routes>
	)
}

export default App
