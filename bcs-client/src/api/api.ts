import axios from 'axios'

// http://localhost:8000
// https://api.bcs-web.online

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'https://api.bcs-web.online',
	headers: {
		'Content-Type': 'application/json',
	},
})

export default api
