'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface PatientPortalSpecialistOption {
  id: string
  name: string
  specialty: string
}

export interface PatientPortalProcedureOption {
  id: string
  name: string
  price: number
}

export interface PatientPortalScheduleOptions {
  specialists: PatientPortalSpecialistOption[]
  procedures: PatientPortalProcedureOption[]
  timeSlots: string[]
}

export function useOpcoesAgendamento(selectedDate?: string) {
  const api = useApi()
  const [data, setData] = useState<PatientPortalScheduleOptions>({ specialists: [], procedures: [], timeSlots: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const qs = selectedDate ? `?date=${selectedDate}` : ''
        const response = await api.get<{ data: PatientPortalScheduleOptions }>(`/api/portal/agendamento-opcoes${qs}`)
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar opções')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api, selectedDate])

  return { data, isLoading, error }
}
