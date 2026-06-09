'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface DisparoItem {
  id: string
  tipo: string
  status: string
  telefone: string
  paciente: string
  pacienteId?: string
  agendamentoId?: string
  mensagem: string
  erroDetalhe?: string
  agendadoPara: string
  agendadoParaIso: string
  enviadoEm?: string
  criadoEm: string
}

export function useDisparos() {
  const api = useApi()
  const [data, setData] = useState<DisparoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<DisparoItem>>('/api/whatsapp/disparar')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar disparos')
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const processarPendentes = async () => {
    const response = await api.post<{ processados: number; erros: number; motivo?: string }>(
      '/api/whatsapp/disparar',
      { action: 'processar_pendentes' },
    )
    await load()
    return response
  }

  const dispararCampanha = async (pacienteIds: string[], mensagem: string) => {
    const response = await api.post<{ agendados: number }>('/api/whatsapp/disparar', {
      action: 'campanha',
      pacienteIds,
      mensagem,
    })
    await load()
    return response
  }

  return { data, isLoading, error, load, processarPendentes, dispararCampanha }
}
