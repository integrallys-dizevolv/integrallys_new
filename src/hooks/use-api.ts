import { useMemo } from 'react'
import { apiClient } from '@/lib/api-client'

export function useApi() {
  return useMemo(() => {
    const request = <T>(url: string, init?: RequestInit) => apiClient<T>(url, init)

    return {
      get: <T>(url: string) => request<T>(url),
      post: <T>(url: string, body?: unknown) =>
        request<T>(url, {
          method: 'POST',
          body: body ? JSON.stringify(body) : undefined,
        }),
      put: <T>(url: string, body?: unknown) =>
        request<T>(url, {
          method: 'PUT',
          body: body ? JSON.stringify(body) : undefined,
        }),
      delete: <T>(url: string, body?: unknown) =>
        request<T>(url, {
          method: 'DELETE',
          body: body ? JSON.stringify(body) : undefined,
        }),
    }
  }, [])
}
