'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface DocumentoEmitidoItem {
  id: string
  template_id: string
  template_nome: string
  template_tipo: string
  paciente_id: string | null
  paciente_nome: string
  profissional_id: string | null
  profissional_nome: string
  agendamento_id: string | null
  gerado_em: string
  disponivel_no_portal: boolean
  pdf_url: string | null
}

export interface DocumentoEmitidoFiltros {
  pacienteId?: string | null
  templateId?: string | null
  desde?: string | null
  ate?: string | null
}

interface TemplateResumo {
  id: string
  nome: string
  tipo: string
}

interface Response {
  data: DocumentoEmitidoItem[]
  templates: TemplateResumo[]
}

export function useDocumentosEmitidos() {
  const api = useApi()
  const [data, setData] = useState<DocumentoEmitidoItem[]>([])
  const [templates, setTemplates] = useState<TemplateResumo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<DocumentoEmitidoFiltros>({})

  const load = useCallback(
    async (f: DocumentoEmitidoFiltros) => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (f.pacienteId) params.set('paciente_id', f.pacienteId)
        if (f.templateId) params.set('template_id', f.templateId)
        if (f.desde) params.set('desde', f.desde)
        if (f.ate) params.set('ate', f.ate)
        const qs = params.toString()
        const url = qs ? `/api/documentos/emitidos?${qs}` : '/api/documentos/emitidos'
        const res = await api.get<Response>(url)
        setData(res.data ?? [])
        setTemplates(res.templates ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar documentos')
      } finally {
        setIsLoading(false)
      }
    },
    [api],
  )

  useEffect(() => {
    void load(filtros)
  }, [load, filtros])

  return {
    data,
    templates,
    isLoading,
    error,
    filtros,
    setFiltros,
    reload: () => load(filtros),
  }
}
