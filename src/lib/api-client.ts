import type { ApiErrorResponse } from '@/types/api'

export class ApiClientError extends Error implements ApiErrorResponse {
  error: string
  code: string
  status: number

  constructor(payload: ApiErrorResponse, status: number) {
    super(payload.error)
    this.name = 'ApiClientError'
    this.error = payload.error
    this.code = payload.code
    this.status = status
  }
}

export async function apiClient<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let payload: ApiErrorResponse = {
      error: `Erro ${response.status}`,
      code: `HTTP_${response.status}`,
    }

    try {
      const body = (await response.json()) as ApiErrorResponse
      if (body.error && body.code) {
        payload = body
      }
    } catch {
      payload = {
        error: response.statusText || payload.error,
        code: payload.code,
      }
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      // CR-AUTH-01 · QC-06: preserva a rota atual em `redirectTo` (login/page.tsx
      // já honra esse param, linhas 70-78) e marca o motivo do redirect via
      // `reason=session_expired` — login/page pode exibir banner quando lê esse
      // param. Evita também loops quando o 401 vier de DENTRO da própria /login.
      const currentPath = window.location.pathname + window.location.search
      if (!currentPath.startsWith('/login')) {
        const loginUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}&reason=session_expired`
        window.location.href = loginUrl
      }
    }

    throw new ApiClientError(payload, response.status)
  }

  return response.json() as Promise<T>
}
