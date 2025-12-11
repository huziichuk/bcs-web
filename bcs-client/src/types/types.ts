export interface Ammunition {
	atgm: number
	cluster_shells: number
	unitary_shells: number
	fpv_drones: number
}

export interface CreateSession {
	custom_id: string | null
	filename: string
	ammunition: Ammunition
}

export interface GetOffer {
	sdp: string
	type: RTCSdpType
}

export interface EnqueueResp {
	job_id: string
	position: number | null
}
