'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface RelatorioEstoqueItem {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  produto: string
  quantidade: number
  precoCusto: number | null
  operador: string | null
  vinculoTipo: string | null
  vinculoNome: string | null
  observacao: string | null
}

export interface RelatorioEstoqueFilters {
  tipo: 'todos' | 'entrada' | 'saida'
  tipoMovimentacao?: 'todos' | 'saida' | 'consumo_interno' | 'entrada'
  inicio: string
  fim: string
  busca: string
}

interface Response {
  data: RelatorioEstoqueItem[]
  meta: { totalEntradas: number; totalSaidas: number }
}

export function useRelatorioEstoque(filters: RelatorioEstoqueFilters) {
  const api = useApi()
  const [data, setData] = useState<RelatorioEstoqueItem[]>([])
  const [totalEntradas, setTotalEntradas] = useState(0)
  const [totalSaidas, setTotalSaidas] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.tipo !== 'todos') params.set('tipo', filters.tipo)
      if (filters.tipoMovimentacao && filters.tipoMovimentacao !== 'todos') {
        params.set('tipoMovimentacao', filters.tipoMovimentacao)
      }
      if (filters.inicio) params.set('inicio', filters.inicio)
      if (filters.fim) params.set('fim', filters.fim)
      if (filters.busca) params.set('q', filters.busca)
      const qs = params.toString()
      const res = await api.get<Response>(`/api/relatorios/estoque${qs ? `?${qs}` : ''}`)
      setData(res.data)
      setTotalEntradas(res.meta.totalEntradas ?? 0)
      setTotalSaidas(res.meta.totalSaidas ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar movimentações')
    } finally {
      setIsLoading(false)
    }
  }, [api, filters.tipo, filters.tipoMovimentacao, filters.inicio, filters.fim, filters.busca])

  useEffect(() => {
    void load()
  }, [load])

  return { data, totalEntradas, totalSaidas, isLoading, error, reload: load }
}

export interface CurvaAbcRow {
  produtoId: string
  produtoNome: string
  categoria: string
  quantidadeSaida: number
  valorConsumido: number
  percentualAcumulado: number
  classe: 'A' | 'B' | 'C'
  taxaGiro: number
  estoqueAtual: number
  valorEstoque: number
}

export interface CurvaAbcResponse {
  curvaAbc: CurvaAbcRow[]
  semMovimentacao: Array<{ produtoId: string; produtoNome: string; diasSemMovimento: number }>
  valorTotalEstoque: number
  diasAnalisados: number
}

const INITIAL_CURVA_ABC: CurvaAbcResponse = {
  curvaAbc: [],
  semMovimentacao: [],
  valorTotalEstoque: 0,
  diasAnalisados: 90,
}

export function useCurvaAbc(dias: number) {
  const api = useApi()
  const [data, setData] = useState<CurvaAbcResponse>(INITIAL_CURVA_ABC)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ view: 'curva-abc', dias: String(dias) })
      const res = await api.get<CurvaAbcResponse>(`/api/relatorios/estoque?${params.toString()}`)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar curva ABC')
    } finally {
      setIsLoading(false)
    }
  }, [api, dias])

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, error, reload: load }
}
