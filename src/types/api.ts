export interface ApiErrorResponse {
  error: string
  code: string
}

export interface ApiListResponse<T> {
  data: T[]
  meta: Record<string, unknown>
}
