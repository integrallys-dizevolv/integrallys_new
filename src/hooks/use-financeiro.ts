'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface FinanceiroItem {
  id: string
  descricao: string
  categoria: string
  valor: number
  tipo: 'receita' | 'despesa'
  data?: string
  status?: string
  metodo?: string
  observacoes?: string
}

export interface CreateFinanceiroPayload {
  id?: string
  descricao: string
  categoria: string
  valor: number
  tipo: 'receita' | 'despesa'
  data?: string
  metodo?: string
  status?: string
  observacoes?: string
  unidadeId?: string
}

export function useFinanceiro() {
  const api = useApi()
  const [data, setData] = useState<FinanceiroItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<FinanceiroItem>>('/api/financeiro')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<FinanceiroItem>>('/api/financeiro')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const createLancamento = async (payload: CreateFinanceiroPayload) => {
    const response = await api.post<ApiListResponse<FinanceiroItem>>('/api/financeiro', payload)
    setData(response.data)
  }

  const updateLancamento = async (payload: CreateFinanceiroPayload) => {
    const response = await api.put<ApiListResponse<FinanceiroItem>>('/api/financeiro', payload)
    setData(response.data)
  }

  const deleteLancamento = async (id: string) => {
    const response = await api.delete<ApiListResponse<FinanceiroItem>>('/api/financeiro', { id })
    setData(response.data)
  }

  return { data, isLoading, error, load, createLancamento, updateLancamento, deleteLancamento }
}
