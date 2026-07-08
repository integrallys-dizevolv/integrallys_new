'use client'

import { useApi } from '@/hooks/use-api'

interface NovoAgendamentoInput {
  specialistId: string
  procedureName: string
  procedurePrice: number
  date: string
  time: string
}

export function useAgendamento() {
  const api = useApi()

  const createAgendamento = async (payload: NovoAgendamentoInput) => {
    return api.post<{ data: unknown[]; meta: Record<string, unknown> }>('/api/portal/agendamentos', payload)
  }

  return { createAgendamento }
}
