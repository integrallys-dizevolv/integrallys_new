'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'
import type { FornecedorInput, FornecedorItem } from '@/types/fornecedor'

export function useFornecedores() {
  const api = useApi()
  const [data, setData] = useState<FornecedorItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<FornecedorItem>>('/api/fornecedores')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<FornecedorItem>>('/api/fornecedores')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [api])

  const createFornecedor = async (payload: FornecedorInput) => {
    const response = await api.post<ApiListResponse<FornecedorItem>>('/api/fornecedores', payload)
    setData(response.data)
    return response.data
  }

  const updateFornecedor = async (payload: FornecedorInput) => {
    const response = await api.put<ApiListResponse<FornecedorItem>>('/api/fornecedores', payload)
    setData(response.data)
    return response.data
  }

  const deleteFornecedor = async (id: string) => {
    const response = await api.delete<ApiListResponse<FornecedorItem>>('/api/fornecedores', { id })
    setData(response.data)
    return response.data
  }

  return {
    data,
    isLoading,
    error,
    load,
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  }
}
