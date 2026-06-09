'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface ConfiguracaoItem {
  id: string
  chave: string
  valor: string
  categoria: string
}

export function useConfiguracoes() {
  const api = useApi()
  const [data, setData] = useState<ConfiguracaoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<ConfiguracaoItem>>('/api/configuracoes')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar configuracoes')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const saveConfiguracoes = async (
    items: Array<{ chave: string; valor: string; categoria: string }>,
  ) => {
    const response = await api.put<ApiListResponse<ConfiguracaoItem>>('/api/configuracoes', items)
    setData(response.data)
    return response.data
  }

  const deleteConfiguracao = async (chave: string) => {
    const response = await api.delete<ApiListResponse<ConfiguracaoItem>>('/api/configuracoes', { chave })
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, saveConfiguracoes, deleteConfiguracao }
}
