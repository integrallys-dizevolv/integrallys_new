'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface PacientePortalData {
  cards: Array<{ id: string; label: string; value: string }>
  nextAppointment: {
    medico: string
    especialidade: string
    data: string
  } | null
  lastAppointment: {
    medico: string
    especialidade: string
    data: string
    status: string
  } | null
  recentHistory: Array<{
    id: string
    data: string
    especialidade: string
    medico: string
    status: string
  }>
}

export function usePacientePortal() {
  const api = useApi()
  const [data, setData] = useState<PacientePortalData>({
    cards: [],
    nextAppointment: null,
    lastAppointment: null,
    recentHistory: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<PacientePortalData>('/api/portal/dashboard')
        if (!mounted) return
        setData(response)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar portal do paciente')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  return { data, isLoading, error }
}
