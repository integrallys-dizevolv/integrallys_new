'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface FormaPagamentoItem {
  id: string
  nome: string
  tipo: string
  cartaoId?: string
  ativo: boolean
}

export interface FormaPagamentoInput {
  id?: string
  nome: string
  tipo: string
  ativo?: boolean
}

export function useFormasPagamento() {
  const api = useApi()
  const [data, setData] = useState<FormaPagamentoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<FormaPagamentoItem>>('/api/formas-pagamento')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar formas de pagamento')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const createForma = async (payload: FormaPagamentoInput) => {
    const response = await api.post<ApiListResponse<FormaPagamentoItem>>(
      '/api/formas-pagamento',
      payload,
    )
    setData(response.data)
    return response.data
  }

  const updateForma = async (payload: FormaPagamentoInput) => {
    const response = await api.put<ApiListResponse<FormaPagamentoItem>>(
      '/api/formas-pagamento',
      payload,
    )
    setData(response.data)
    return response.data
  }

  const deleteForma = async (id: string) => {
    const response = await api.delete<ApiListResponse<FormaPagamentoItem>>(
      '/api/formas-pagamento',
      { id },
    )
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, createForma, updateForma, deleteForma }
}
