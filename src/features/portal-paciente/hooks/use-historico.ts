'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface HistoricoItem {
  id: string
  data: string
  tipo: string
  profissional: string
  medico: string
  local: string
  status: string
  especialidade: string
}

export function useHistorico() {
  const api = useApi()
  const [data, setData] = useState<HistoricoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<HistoricoItem>>('/api/portal/historico')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar historico')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  return { data, isLoading, error }
}
