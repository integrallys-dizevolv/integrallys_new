'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'
import type { ProfissionalInput, ProfissionalItem } from '@/types/profissional'

export function useProfissionais() {
  const api = useApi()
  const [data, setData] = useState<ProfissionalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<ProfissionalItem>>('/api/profissionais')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar profissionais')
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
        const response = await api.get<ApiListResponse<ProfissionalItem>>('/api/profissionais')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar profissionais')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [api])

  const createProfissional = async (payload: ProfissionalInput) => {
    const response = await api.post<ApiListResponse<ProfissionalItem>>(
      '/api/profissionais',
      payload,
    )
    setData(response.data)
    return response.data
  }

  const updateProfissional = async (payload: ProfissionalInput) => {
    const response = await api.put<ApiListResponse<ProfissionalItem>>('/api/profissionais', payload)
    setData(response.data)
    return response.data
  }

  const deleteProfissional = async (id: string) => {
    const response = await api.delete<ApiListResponse<ProfissionalItem>>('/api/profissionais', {
      id,
    })
    setData(response.data)
    return response.data
  }

  return {
    data,
    isLoading,
    error,
    load,
    createProfissional,
    updateProfissional,
    deleteProfissional,
  }
}
