'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface DreItemDetail {
  label: string
  value: number
}

export interface DreItem {
  id: number
  label: string
  value: number
  type: 'positive' | 'negative' | 'neutral' | 'summary' | 'total' | 'result'
  sub?: string
  sub2?: string
  expandable?: boolean
  details?: DreItemDetail[]
}

export interface DreResumo {
  receitaBruta: number
  /**
   * Desde a CR-REV-I representa **Receita líquida** (Receita bruta − Deduções).
   * A chave segue como `lucroBruto` por retrocompatibilidade com componentes
   * que ainda lêem o campo. A UI exibe o valor como "Receita líquida".
   */
  lucroBruto: number
  ebitda: number
  lucroLiquido: number
}

export interface DreFiltersInput {
  periodo: 'mensal' | 'trimestral' | 'anual' | 'diario'
  mesAno: string
  unidade: string
  visao: string
  busca: string
  tipo: 'todos' | 'receita' | 'despesa'
  categoria: string
  /** Período B do modo comparativo: 'YYYY-MM' (ou 'YYYY-MM-DD' no diário). */
  comparar?: string
}

interface DrePeriodoResultado {
  label: string
  resumo: DreResumo
  items: DreItem[]
}

export interface DreComparativoResponse {
  periodoA: DrePeriodoResultado
  periodoB: DrePeriodoResultado
  /** Variação percentual A vs B (positivo = A maior que B). */
  variacao: { receitaBruta: number; lucroLiquido: number }
}

export interface DreUnitOption {
  value: string
  label: string
}

export interface DreCategoryOption {
  value: string
  label: string
}

interface DreSnapshotResponse {
  data: {
    id: string
    periodType: DreFiltersInput['periodo']
    reference: string
    title: string
    resumo: DreResumo
    items: DreItem[]
    filters: Record<string, unknown>
    generatedAt: string
    updatedAt: string
  }
  comparativo?: DreComparativoResponse | null
  meta: {
    unitOptions: DreUnitOption[]
    categoryOptions: DreCategoryOption[]
    scopedUnitId: string | null
  }
}

function buildQuery(filters: DreFiltersInput) {
  const params = new URLSearchParams({
    periodo: filters.periodo,
    mesAno: filters.mesAno,
    unidade: filters.unidade,
    visao: filters.visao,
    busca: filters.busca,
    tipo: filters.tipo,
    categoria: filters.categoria,
  })

  if (filters.comparar) params.set('comparar', filters.comparar)

  return `/api/dre?${params.toString()}`
}

export function useDre(filters: DreFiltersInput) {
  const api = useApi()
  const [data, setData] = useState<DreSnapshotResponse['data'] | null>(null)
  const [comparativo, setComparativo] = useState<DreComparativoResponse | null>(null)
  const [unitOptions, setUnitOptions] = useState<DreUnitOption[]>([{ value: 'todas', label: 'Todas as unidades' }])
  const [categoryOptions, setCategoryOptions] = useState<DreCategoryOption[]>([{ value: 'todas', label: 'Todas as categorias' }])
  const [scopedUnitId, setScopedUnitId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (nextFilters: DreFiltersInput, force = false) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = force
          ? await api.post<DreSnapshotResponse>('/api/dre', nextFilters)
          : await api.get<DreSnapshotResponse>(buildQuery(nextFilters))

        setData(response.data)
        setComparativo(response.comparativo ?? null)
        setUnitOptions(response.meta.unitOptions ?? [{ value: 'todas', label: 'Todas as unidades' }])
        setCategoryOptions(response.meta.categoryOptions ?? [{ value: 'todas', label: 'Todas as categorias' }])
        setScopedUnitId(response.meta.scopedUnitId ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar DRE')
      } finally {
        setIsLoading(false)
      }
    },
    [api],
  )

  useEffect(() => {
    void load(filters, false)
  }, [filters, load])

  return {
    data,
    comparativo,
    unitOptions,
    categoryOptions,
    scopedUnitId,
    isLoading,
    error,
    reload: (nextFilters = filters, force = false) => load(nextFilters, force),
  }
}
