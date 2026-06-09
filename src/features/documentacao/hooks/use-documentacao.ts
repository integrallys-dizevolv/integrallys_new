'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface DocumentoClinicoItem {
  id: string
  pacienteId?: string
  paciente: string
  nome?: string
  categoria?: string
  descricao?: string
  template?: string
  especialista?: string
  tipo: string
  atualizadoEm: string
  meio?: string
  recebido?: boolean
  anexoUrl?: string
}

export interface DocumentoClinicoInput {
  id?: string
  pacienteId: string
  tipo: string
  nome?: string
  categoria?: string
  descricao?: string
  template?: string
  especialista?: string
  meio?: string
  recebido?: boolean
  anexoUrl?: string
}

export function useDocumentacao() {
  const api = useApi()
  const [data, setData] = useState<DocumentoClinicoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApiListResponse<DocumentoClinicoItem>>('/api/documentacao')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentacao clinica')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<DocumentoClinicoItem>>('/api/documentacao')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar documentacao clinica')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [api])

  const createDocumento = async (payload: DocumentoClinicoInput) => {
    const response = await api.post<ApiListResponse<DocumentoClinicoItem>>('/api/documentacao', payload)
    setData(response.data)
    return response.data
  }

  const updateDocumento = async (payload: DocumentoClinicoInput) => {
    const response = await api.put<ApiListResponse<DocumentoClinicoItem>>('/api/documentacao', payload)
    setData(response.data)
    return response.data
  }

  const deleteDocumento = async (id: string) => {
    const response = await api.delete<ApiListResponse<DocumentoClinicoItem>>('/api/documentacao', { id })
    setData(response.data)
    return response.data
  }

  return { data, isLoading, error, load, createDocumento, updateDocumento, deleteDocumento }
}
