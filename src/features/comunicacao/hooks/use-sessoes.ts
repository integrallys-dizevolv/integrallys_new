'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface SessaoItem {
  id: string
  telefone: string
  paciente: string
  pacienteId?: string
  estado: string
  contextoResumo: string
  ultimaInteracao: string
  ultimaInteracaoIso: string
  criadoEm: string
}

interface SessoesResponse extends ApiListResponse<SessaoItem> {
  meta: {
    sessoesAtivas?: number
    agendamentosHoje?: number
    agendamentosSemana?: number
  } & Record<string, unknown>
}

export function useSessoes() {
  const api = useApi()
  const [data, setData] = useState<SessaoItem[]>([])
  const [meta, setMeta] = useState<{
    sessoesAtivas: number
    agendamentosHoje: number
    agendamentosSemana: number
  }>({ sessoesAtivas: 0, agendamentosHoje: 0, agendamentosSemana: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<SessoesResponse>('/api/whatsapp/sessoes')
      setData(response.data)
      setMeta({
        sessoesAtivas: Number(response.meta?.sessoesAtivas ?? 0),
        agendamentosHoje: Number(response.meta?.agendamentosHoje ?? 0),
        agendamentosSemana: Number(response.meta?.agendamentosSemana ?? 0),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar sessões')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const encerrarSessao = async (telefone: string) => {
    const response = await api.post<SessoesResponse>('/api/whatsapp/sessoes', {
      action: 'encerrar_sessao',
      telefone,
    })
    setData(response.data)
    setMeta({
      sessoesAtivas: Number(response.meta?.sessoesAtivas ?? 0),
      agendamentosHoje: Number(response.meta?.agendamentosHoje ?? 0),
      agendamentosSemana: Number(response.meta?.agendamentosSemana ?? 0),
    })
    return response.data
  }

  return { data, meta, isLoading, error, load, encerrarSessao }
}
