'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export interface CartaoItem {
  id: string
  bandeira: string
  final: string
  titular: string
}

interface CartaoInput {
  bandeira: string
  final: string
  titular: string
}

export function useCartoes() {
  const api = useApi()
  const [data, setData] = useState<CartaoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<CartaoItem>>('/api/portal/cartoes')
        if (!mounted) return
        setData(response.data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar cartoes')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const createCartao = async (payload: CartaoInput) => {
    const response = await api.post<ApiListResponse<CartaoItem>>('/api/portal/cartoes', payload)
    setData(response.data)
  }

  return { data, isLoading, error, createCartao }
}
