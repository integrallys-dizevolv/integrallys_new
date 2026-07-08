'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface RepasseItem {
  id: string
  profissional: string
  profissionalId?: string
  unidade?: string
  unidadeId?: string
  periodo: string
  valor: number
  status: string
  pagoEm?: string
  tipoVinculo?: 'interno' | 'parceiro'
}

export interface RepasseRuleItem {
  id: string
  profissionalId: string
  profissional: string
  unidadeId?: string
  unidade?: string
  percentual: number | null
  valorFixo: number | null
  ativo: boolean
  observacoes?: string
}

export interface RepasseOption {
  id: string
  nome: string
}

interface RepasseMetaResponse extends Record<string, unknown> {
  rules?: RepasseRuleItem[]
  profissionais?: RepasseOption[]
  unidades?: RepasseOption[]
}

interface RepasseResponse extends ApiListResponse<RepasseItem> {
  meta: RepasseMetaResponse
}

export interface GenerateRepassePayload {
  periodoInicio: string
  periodoFim: string
  profissionalId?: string
  unidadeId?: string
}

export interface SaveRepasseRulePayload {
  id?: string
  profissionalId: string
  unidadeId?: string
  percentual?: number | null
  valorFixo?: number | null
  ativo?: boolean
  observacoes?: string
}

export function useRepasse() {
  const api = useApi()
  const [data, setData] = useState<RepasseItem[]>([])
  const [rules, setRules] = useState<RepasseRuleItem[]>([])
  const [profissionais, setProfissionais] = useState<RepasseOption[]>([])
  const [unidades, setUnidades] = useState<RepasseOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const updateFromResponse = (response: RepasseResponse) => {
    setData(response.data)
    setRules(response.meta.rules ?? [])
    setProfissionais(response.meta.profissionais ?? [])
    setUnidades(response.meta.unidades ?? [])
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<RepasseResponse>('/api/repasse')
        if (!mounted) return
        updateFromResponse(response)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar repasse')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const generateRepasse = async (payload: GenerateRepassePayload) => {
    const response = await api.post<RepasseResponse>('/api/repasse', { action: 'generate', ...payload })
    updateFromResponse(response)
  }

  const saveRule = async (payload: SaveRepasseRulePayload) => {
    const response = await api.post<RepasseResponse>('/api/repasse', { action: 'saveRule', ...payload })
    updateFromResponse(response)
  }

  const deleteRule = async (id: string) => {
    const response = await api.post<RepasseResponse>('/api/repasse', { action: 'deleteRule', id })
    updateFromResponse(response)
  }

  const payRepasse = async (id: string) => {
    const response = await api.post<RepasseResponse>('/api/repasse', { action: 'pay', id })
    updateFromResponse(response)
  }

  const updateRepasse = async (payload: { id: string; status: string; pagoEm?: string }) => {
    const response = await api.put<RepasseResponse>('/api/repasse', payload)
    updateFromResponse(response)
    return response.data
  }

  const cancelRepasse = async (id: string) => {
    const response = await api.post<RepasseResponse>('/api/repasse', { action: 'cancel', id })
    updateFromResponse(response)
  }

  return {
    data,
    rules,
    profissionais,
    unidades,
    isLoading,
    error,
    generateRepasse,
    saveRule,
    deleteRule,
    payRepasse,
    updateRepasse,
    cancelRepasse,
  }
}
