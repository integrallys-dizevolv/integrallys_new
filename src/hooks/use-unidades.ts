'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface UnidadeItem {
  id: string
  nome: string
  cidade: string
  status: string
  cnpj?: string
  endereco?: string
  gestor?: string
}

export interface UnidadeInput {
  id?: string
  nome: string
  cidade: string
  cnpj?: string
  endereco?: string
  gestor?: string
  status?: string
}

export function useUnidades() {
  const api = useApi()
  const [data, setData] = useState<UnidadeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<UnidadeItem>>('/api/unidades')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar unidades')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const loadUnidades = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<UnidadeItem>>('/api/unidades')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar unidades')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadUnidades()
    return () => {
      mounted = false
    }
  }, [api])

  const createUnidade = async (payload: UnidadeInput) => {
    const response = await api.post<ApiListResponse<UnidadeItem>>('/api/unidades', payload)
    setData(response.data)
    return response.data
  }

  const updateUnidade = async (payload: UnidadeInput) => {
    const response = await api.put<ApiListResponse<UnidadeItem>>('/api/unidades', payload)
    setData(response.data)
    return response.data
  }

  const deleteUnidade = async (id: string) => {
    const response = await api.delete<ApiListResponse<UnidadeItem>>('/api/unidades', { id })
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, load, createUnidade, updateUnidade, deleteUnidade }
}
