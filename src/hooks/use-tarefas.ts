'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface TarefaItem {
  id: string
  titulo: string
  responsavel: string
  status: string
}

export interface CreateTarefaPayload {
  titulo: string
  descricao?: string
  responsavelId?: string
  responsavelNome?: string
  status?: string
  vencimentoEm?: string
}

export function useTarefas() {
  const api = useApi()
  const [data, setData] = useState<TarefaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<TarefaItem>>('/api/tarefas')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas')
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
        const response = await api.get<ApiListResponse<TarefaItem>>('/api/tarefas')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const createTarefa = async (payload: CreateTarefaPayload) => {
    const response = await api.post<ApiListResponse<TarefaItem>>('/api/tarefas', payload)
    setData(response.data)
    return response.data
  }

  const updateTarefa = async (payload: CreateTarefaPayload & { id: string }) => {
    const response = await api.put<ApiListResponse<TarefaItem>>('/api/tarefas', payload)
    setData(response.data)
    return response.data
  }

  const deleteTarefa = async (id: string) => {
    const response = await api.delete<ApiListResponse<TarefaItem>>('/api/tarefas', { id })
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, load, createTarefa, updateTarefa, deleteTarefa }
}
