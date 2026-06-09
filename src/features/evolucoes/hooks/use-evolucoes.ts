'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface EvolucaoItem {
  id: string
  pacienteId?: string
  paciente: string
  data: string
  tipo: string
  resumo: string
  retornoRecepcao?: string
  docsCount?: number
}

export interface NovaEvolucaoInput {
  id?: string
  pacienteId: string
  data: string
  tipo: string
  resumo: string
  retornoRecepcao?: string
}

export function useEvolucoes() {
  const api = useApi()
  const [data, setData] = useState<EvolucaoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<EvolucaoItem>>('/api/evolucoes')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar evolucoes')
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
        const response = await api.get<ApiListResponse<EvolucaoItem>>('/api/evolucoes')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar evolucoes')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [api])

  const createEvolucao = async (payload: NovaEvolucaoInput) => {
    const response = await api.post<ApiListResponse<EvolucaoItem>>('/api/evolucoes', payload)
    setData(response.data)
    return response.data
  }

  const updateEvolucao = async (payload: NovaEvolucaoInput) => {
    const response = await api.put<ApiListResponse<EvolucaoItem>>('/api/evolucoes', payload)
    setData(response.data)
    return response.data
  }

  const deleteEvolucao = async (id: string) => {
    const response = await api.delete<ApiListResponse<EvolucaoItem>>('/api/evolucoes', { id })
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, load, createEvolucao, updateEvolucao, deleteEvolucao }
}
