'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface PatientPortalAlertConfig {
  title: string
  message: string
}

export const DEFAULT_ALERTA_PORTAL: PatientPortalAlertConfig = {
  title: 'Importante: Retornos com Desconto',
  message:
    'Retornos de Bioressonancia Quantica tem 50% de desconto se agendados dentro de 35 dias corridos apos a ultima consulta. Apos esse prazo, o valor sera integral.',
}

export function useAlertaPortal() {
  const api = useApi()
  const [data, setData] = useState<PatientPortalAlertConfig>(DEFAULT_ALERTA_PORTAL)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<{ data: PatientPortalAlertConfig }>('/api/portal/alert')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar mensagem do portal')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const save = async (config: PatientPortalAlertConfig) => {
    const response = await api.put<{ data: PatientPortalAlertConfig }>('/api/portal/alert', config)
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, save, setData }
}
