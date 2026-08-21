'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface RankingProdutoRow {
  produtoId: string | null
  nome: string
  quantidade: number
  receita: number
  margem: number
}

export function useRankingProdutos(dias = 90) {
  const api = useApi()
  const [vendidos, setVendidos] = useState<RankingProdutoRow[]>([])
  const [lucrativos, setLucrativos] = useState<RankingProdutoRow[]>([])
  const [valoresVisiveis, setValoresVisiveis] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<{
        data: { vendidos: RankingProdutoRow[]; lucrativos: RankingProdutoRow[] }
        meta: { valoresVisiveis?: boolean }
      }>(`/api/relatorios/ranking-produtos?dias=${dias}`)
      setVendidos(res.data?.vendidos ?? [])
      setLucrativos(res.data?.lucrativos ?? [])
      setValoresVisiveis(res.meta?.valoresVisiveis !== false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ranking')
    } finally {
      setIsLoading(false)
    }
  }, [api, dias])

  useEffect(() => {
    void load()
  }, [load])

  return { vendidos, lucrativos, valoresVisiveis, isLoading, error, reload: load }
}

export interface ComparativoUnidadeRow {
  unidadeId: string
  unidadeNome: string
  agendamentos: number
  receita: number
  despesa: number
  ticketMedio: number
}

export function useComparativoUnidades(dias = 30) {
  const api = useApi()
  const [data, setData] = useState<ComparativoUnidadeRow[]>([])
  const [valoresVisiveis, setValoresVisiveis] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<{
        data: ComparativoUnidadeRow[]
        meta: { valoresVisiveis?: boolean }
      }>(`/api/relatorios/comparativo-unidades?dias=${dias}`)
      setData(res.data ?? [])
      setValoresVisiveis(res.meta?.valoresVisiveis !== false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar comparativo')
    } finally {
      setIsLoading(false)
    }
  }, [api, dias])

  useEffect(() => {
    void load()
  }, [load])

  return { data, valoresVisiveis, isLoading, error, reload: load }
}
