import type { CreateSession, EnqueueResp, GetOffer } from '../types/types'
import api from './api'

export const apiGetVideos = () => api.get<{ videos: string[] }>('/videos')

export const apiCreateSession = (data: CreateSession) =>
	api.post('/session', data)

export const apiGetOffer = (sessionId: string, data: GetOffer) =>
	api.post<EnqueueResp>(`/session/${sessionId}/offer`, data)
