'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'

export interface ConversaMensagem {
  id: string
  direcao: 'in' | 'out'
  conteudo: string
  createdAt: string
}

interface MensagemRow {
  id: string
  telefone: string
  direcao: string
  conteudo: string
  created_at: string
}

interface ConversaResponse {
  data: MensagemRow[]
}

/** Carrega o transcript da conversa do chatbot para um telefone. `null` => não busca. */
export function useConversa(telefone: string | null) {
  const api = useApi()
  const [mensagens, setMensagens] = useState<ConversaMensagem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!telefone) {
      setMensagens([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<ConversaResponse>(
        `/api/whatsapp/mensagens?telefone=${encodeURIComponent(telefone)}`,
      )
      setMensagens(
        res.data.map((r) => ({
          id: String(r.id),
          direcao: r.direcao === 'out' ? 'out' : 'in',
          conteudo: String(r.conteudo ?? ''),
          createdAt: String(r.created_at),
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a conversa')
    } finally {
      setIsLoading(false)
    }
  }, [api, telefone])

  useEffect(() => {
    void load()
  }, [load])

  return { mensagens, isLoading, error, reload: load }
}
