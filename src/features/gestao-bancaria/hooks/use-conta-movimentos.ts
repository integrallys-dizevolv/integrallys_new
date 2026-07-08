'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface ContaMovimento {
  id: string
  dataTransacao: string | null
  valor: number
  descricao: string | null
  tipo: 'CREDIT' | 'DEBIT' | null
  conciliado: boolean
  lancamentoId: string | null
  createdAt: string
}

interface MovimentoRow {
  id: string
  data_transacao: string | null
  valor: number | string | null
  descricao: string | null
  tipo: string | null
  conciliado: boolean
  lancamento_id: string | null
  created_at: string
}

interface MovimentosResponse {
  data: MovimentoRow[]
}

/** Carrega o extrato (conciliacao_ofx) de uma conta. `null` => não busca. */
export function useContaMovimentos(contaId: string | null) {
  const api = useApi()
  const [movimentos, setMovimentos] = useState<ContaMovimento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!contaId) {
      setMovimentos([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<MovimentosResponse>(
        `/api/gestao-bancaria/ofx?contaId=${encodeURIComponent(contaId)}`,
      )
      setMovimentos(
        res.data.map((r) => ({
          id: String(r.id),
          dataTransacao: r.data_transacao,
          valor: Number(r.valor ?? 0),
          descricao: r.descricao,
          tipo: r.tipo === 'CREDIT' || r.tipo === 'DEBIT' ? r.tipo : null,
          conciliado: Boolean(r.conciliado),
          lancamentoId: r.lancamento_id ? String(r.lancamento_id) : null,
          createdAt: String(r.created_at),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar movimentos')
    } finally {
      setIsLoading(false)
    }
  }, [api, contaId])

  useEffect(() => {
    void load()
  }, [load])

  return { movimentos, isLoading, error, reload: load }
}
