'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface NotificationItem {
  id: string
  title: string
  description: string
  date: string
  timestamp: string
  href: string
  kind: 'agenda' | 'financeiro' | 'lista_espera' | 'pagamento' | 'prescricao'
  read: boolean
}

export function useNotificacoes() {
  const api = useApi()
  const [data, setData] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<NotificationItem>>('/api/notificacoes')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load()
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [load])

  const markAsRead = async (id: string) => {
    await api.post('/api/notificacoes', { id })
    setData((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  const markAllAsRead = async () => {
    const ids = data.filter((item) => !item.read).map((item) => item.id)
    if (ids.length === 0) return
    await api.post('/api/notificacoes', { ids })
    setData((current) => current.map((item) => ({ ...item, read: true })))
  }

  const unreadCount = useMemo(() => data.filter((item) => !item.read).length, [data])

  return { data, isLoading, error, unreadCount, load, markAsRead, markAllAsRead }
}
