export interface CreatePipelineBody {
  namn: string
  kommunSlug: string
  kommunNamn: string
  branschSlug: string
  branschNamn: string
  branschKod: string
  bolagsfaktaForetagCount?: number
}

export interface FetchDetailBody {
  customerId: string
  bolagsfaktaUrl: string
}

export interface JobStatusResponse {
  jobId: string
  state: string
  progress: number | object
  failedReason?: string
  returnvalue?: unknown
  finishedOn?: number
}
