'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface PagamentoPortalItem {
  id: string
  descricao: string
  valor: number
  status: string
  vencimento?: string
  pagamento?: string
  doutor?: string
}

export function usePagamentosPortal() {
  const api = useApi()
  const [data, setData] = useState<PagamentoPortalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<PagamentoPortalItem>>('/api/portal/pagamentos')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar pagamentos')
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
