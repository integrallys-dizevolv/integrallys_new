'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface RelatorioItem {
  id: string
  nome: string
  descricao: string
  atualizadoEm: string
  categoria: string
}

interface RelatoriosMeta {
  tabs?: string[]
}

export function useRelatorios() {
  const api = useApi()
  const [data, setData] = useState<RelatorioItem[]>([])
  const [tabs, setTabs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<RelatorioItem>>('/api/relatorios')
        if (!mounted) return
        setData(response.data)
        setTabs(Array.isArray((response.meta as RelatoriosMeta | undefined)?.tabs) ? ((response.meta as RelatoriosMeta).tabs as string[]) : [])
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatorios')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  return { data, tabs, isLoading, error }
}
