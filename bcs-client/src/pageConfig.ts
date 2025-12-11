class PageConfig {
	apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:8000'
	baseUrl: string = import.meta.env.VITE_BASE_URL || 'http://localhost:5173'
	homeUrl: string = '/'
	sessionLauncherUrl: string = '/session'
	connectSessionUrl: string = '/session/connect'
	createSessionUrl: string = '/session/create'
	becomeWorker: string = '/become-worker'
	activeSessionsUrl: string = '/session/active/:sessionId'
	getActiveSessionUrl = (sessionId: string) => `/session/active/${sessionId}`
}

export const pageConfig = new PageConfig()
