'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface CampanhaItem {
  id: string
  nome: string
  tipo: string
  mensagemTemplate: string
  dataDisparo: string
  horaDisparo: string
  status: string
  totalEnviados: number
  totalErros: number
  filtroEstagio: string | null
  criadoEm: string
}

export interface NovaCampanhaPayload {
  nome: string
  mensagemTemplate: string
  dataDisparo: string
  horaDisparo?: string
  tipo?: string
  filtroEstagio?: string | null
}

export function useCampanhas() {
  const api = useApi()
  const [data, setData] = useState<CampanhaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<CampanhaItem>>('/api/whatsapp/campanhas')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const createCampanha = async (payload: NovaCampanhaPayload) => {
    const response = await api.post<ApiListResponse<CampanhaItem>>(
      '/api/whatsapp/campanhas',
      payload,
    )
    setData(response.data)
    return response.data
  }

  const cancelCampanha = async (id: string) => {
    const response = await api.delete<ApiListResponse<CampanhaItem>>(
      '/api/whatsapp/campanhas',
      { id },
    )
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, load, createCampanha, cancelCampanha }
}
