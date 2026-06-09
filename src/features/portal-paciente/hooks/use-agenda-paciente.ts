'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface PatientAgendaItem {
  id: string
  medico: string
  especialidade: string
  data: string
  local: string
  status: 'Confirmada' | 'Agendado' | 'Concluído' | 'Cancelado'
}

export function useAgendaPaciente() {
  const api = useApi()
  const [data, setData] = useState<PatientAgendaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<PatientAgendaItem>>('/api/portal/agendamentos')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agenda')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<PatientAgendaItem>>('/api/portal/agendamentos')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar agenda')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void run()
    return () => {
      mounted = false
    }
  }, [api])

  const cancelAgendamento = async (id: string) => {
    await api.delete<ApiListResponse<PatientAgendaItem>>(`/api/portal/agendamentos?id=${id}`)
    await load()
  }

  return { data, isLoading, error, cancelAgendamento, reload: load }
}
