'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'
import type { HistoricoItem } from '@/contexts/atendimento-context'

export function useAtendimentoHistorico(pacienteId?: string) {
  const api = useApi()
  const [data, setData] = useState<HistoricoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pacienteId) {
      setData([])
      return
    }
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<HistoricoItem>>(
          `/api/atendimento/historico?pacienteId=${encodeURIComponent(pacienteId)}`,
        )
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar histórico do paciente')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [api, pacienteId])

  return { data, isLoading, error }
}
