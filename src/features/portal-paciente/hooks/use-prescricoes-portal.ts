'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface PrescricaoPortalItem {
  id: string
  profissional: string
  data: string
  tipo: string
  validade: string
  status: 'Ativo' | 'Pendente' | 'Expirado'
}

export function usePrescricoesPortal() {
  const api = useApi()
  const [data, setData] = useState<PrescricaoPortalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<PrescricaoPortalItem>>('/api/portal/prescricoes')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar prescrições')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<PrescricaoPortalItem>>('/api/portal/prescricoes')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar prescrições')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [api])

  const deletePrescricao = async (id: string) => {
    await api.delete<ApiListResponse<PrescricaoPortalItem>>(`/api/portal/prescricoes?id=${id}`)
    await load()
  }

  return { data, isLoading, error, deletePrescricao, reload: load }
}
