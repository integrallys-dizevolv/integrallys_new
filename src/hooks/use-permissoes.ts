'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface PermissaoItem {
  id: string
  recurso: string
  perfil: string
  acoes: string[]
  unidadeId?: string
  unidadeNome?: string
}

export interface PermissaoResourceOption {
  id: string
  codigo: string
  descricao: string
}

type PermissoesResponse = Omit<ApiListResponse<PermissaoItem>, 'meta'> & {
  meta: ApiListResponse<PermissaoItem>['meta'] & {
    resources?: PermissaoResourceOption[]
    units?: Array<{ id: string; nome: string }>
  }
}

export interface SavePermissaoPayload {
  perfil: string
  unidadeId?: string | null
  permissions: Array<{ recurso: string; acoes: string[] }>
}

export function usePermissoes() {
  const api = useApi()
  const [data, setData] = useState<PermissaoItem[]>([])
  const [resources, setResources] = useState<PermissaoResourceOption[]>([])
  const [units, setUnits] = useState<Array<{ id: string; nome: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyResponse = (response: PermissoesResponse) => {
    setData(response.data)
    setResources(response.meta.resources ?? [])
    setUnits(response.meta.units ?? [])
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<PermissoesResponse>('/api/permissoes')
        if (!mounted) return
        applyResponse(response)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar permissoes')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const createPermissao = async (payload: SavePermissaoPayload) => {
    const response = await api.post<PermissoesResponse>('/api/permissoes', payload)
    applyResponse(response)
  }

  const updatePermissao = async (payload: SavePermissaoPayload) => {
    const response = await api.put<PermissoesResponse>('/api/permissoes', payload)
    applyResponse(response)
  }

  const deletePermissao = async (perfil: string, unidadeId?: string | null) => {
    const response = await api.delete<PermissoesResponse>('/api/permissoes', { perfil, unidadeId })
    applyResponse(response)
  }

  return { data, resources, units, isLoading, error, createPermissao, updatePermissao, deletePermissao }
}
