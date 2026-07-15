'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface ContaLancamento {
  id: string
  descricao: string
  categoria: string
  valor: number
  tipo: 'receita' | 'despesa'
  dataLancamento: string | null
  metodo: string | null
  status: string | null
  beneficiario: string | null
}

interface LancamentoRow {
  id: string
  descricao: string | null
  categoria: string | null
  valor: number | string | null
  tipo: string | null
  data_lancamento: string | null
  metodo: string | null
  status: string | null
  beneficiario: string | null
}

interface LancamentosResponse {
  data: LancamentoRow[]
}

/**
 * Item 9d — carrega os lançamentos do Financeiro vinculados a uma conta
 * (via conta_bancaria_id). Exibição pura; `null` => não busca.
 */
export function useContaLancamentos(contaId: string | null) {
  const api = useApi()
  const [lancamentos, setLancamentos] = useState<ContaLancamento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!contaId) {
      setLancamentos([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<LancamentosResponse>(
        `/api/gestao-bancaria/lancamentos?contaId=${encodeURIComponent(contaId)}`,
      )
      setLancamentos(
        res.data.map((r) => ({
          id: String(r.id),
          descricao: String(r.descricao ?? ''),
          categoria: String(r.categoria ?? ''),
          valor: Number(r.valor ?? 0),
          tipo: r.tipo === 'despesa' ? 'despesa' : 'receita',
          dataLancamento: r.data_lancamento,
          metodo: r.metodo,
          status: r.status,
          beneficiario: r.beneficiario,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar lançamentos da conta')
    } finally {
      setIsLoading(false)
    }
  }, [api, contaId])

  useEffect(() => {
    void load()
  }, [load])

  return { lancamentos, isLoading, error, reload: load }
}
