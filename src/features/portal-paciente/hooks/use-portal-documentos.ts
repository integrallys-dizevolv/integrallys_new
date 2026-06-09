'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface PortalDocumento {
  id: string
  template_id: string
  template_nome: string
  gerado_em: string
  pdf_url: string | null
}

interface Response {
  data: PortalDocumento[]
}

export function usePortalDocumentos() {
  const api = useApi()
  const [data, setData] = useState<PortalDocumento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api.get<Response>('/api/portal/documentos')
        if (!mounted) return
        setData(res.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar documentos')
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
