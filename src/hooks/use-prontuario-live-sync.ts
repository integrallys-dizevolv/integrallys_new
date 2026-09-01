'use client'

import { useEffect, useRef, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { useAuth } from '@/hooks/use-auth'

export const PRONTUARIO_LIVE_CHANNEL = 'integrallys-prontuario-live'

/** Throttle do PUT ao servidor (aparelho separado). */
export const PRONTUARIO_LIVE_PUBLISH_THROTTLE_MS = 350

/** Intervalo de poll no viewer (aparelho separado). Meta de latência ~1 s. */
export const PRONTUARIO_LIVE_SUBSCRIBE_POLL_MS = 500

/** Latência teórica máxima publish + poll antes de RTT de rede. */
export const PRONTUARIO_LIVE_MAX_SYNC_MS =
  PRONTUARIO_LIVE_PUBLISH_THROTTLE_MS + PRONTUARIO_LIVE_SUBSCRIBE_POLL_MS

/**
 * Descarta updates mais antigos que o último aplicado (BC + poll).
 */
export function shouldApplyProntuarioLiveUpdate(
  newestUpdatedAt: string | null,
  incomingUpdatedAt: string | null,
): boolean {
  if (!incomingUpdatedAt) return false
  if (!newestUpdatedAt) return true
  return incomingUpdatedAt > newestUpdatedAt
}

export type ProntuarioLivePayload = {
  pacienteId: string
  texto: string
  updatedAt: string
  authorId: string
  source: 'broadcast' | 'server'
  pacienteNome?: string
}

type LiveDraftApi = {
  data: {
    pacienteId: string
    pacienteNome?: string
    texto: string
    authorId: string
    updatedAt: string | null
  } | null
}

function postBroadcast(payload: ProntuarioLivePayload) {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  try {
    const channel = new BroadcastChannel(PRONTUARIO_LIVE_CHANNEL)
    channel.postMessage(payload)
    channel.close()
  } catch {
    // ignore — fallback server poll
  }
}

/**
 * Publica o texto clínico ao vivo: BroadcastChannel (mesma estação) +
 * PUT throttled no servidor (aparelho separado). Não cria prontuario_versoes.
 */
export function useProntuarioLivePublish(
  pacienteId: string | null | undefined,
  texto: string,
  throttleMs = PRONTUARIO_LIVE_PUBLISH_THROTTLE_MS,
) {
  const api = useApi()
  const { user } = useAuth()
  const lastSent = useRef<string>('')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!pacienteId || !user?.id) return

    const updatedAt = new Date().toISOString()
    const payload: ProntuarioLivePayload = {
      pacienteId: String(pacienteId),
      texto,
      updatedAt,
      authorId: String(user.id),
      source: 'broadcast',
    }
    postBroadcast(payload)

    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (lastSent.current === texto) return
      lastSent.current = texto
      void api
        .put<LiveDraftApi>('/api/prontuarios/live-draft', {
          pacienteId: String(pacienteId),
          texto,
        })
        .catch(() => {
          // best-effort
        })
    }, throttleMs)

    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [api, pacienteId, texto, throttleMs, user?.id])
}

/**
 * Assina updates do prontuário ao vivo (BC + poll 500ms).
 * Atualiza o viewer sem pedir reload.
 */
export function useProntuarioLiveSubscribe(
  pacienteId: string | null | undefined,
  pollMs = PRONTUARIO_LIVE_SUBSCRIBE_POLL_MS,
) {
  const api = useApi()
  const [texto, setTexto] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [pacienteNome, setPacienteNome] = useState('')
  const newest = useRef<string | null>(null)

  useEffect(() => {
    if (!pacienteId) return

    let cancelled = false

    const apply = (payload: {
      texto: string
      updatedAt: string | null
      pacienteNome?: string
    }) => {
      if (!shouldApplyProntuarioLiveUpdate(newest.current, payload.updatedAt)) return
      newest.current = payload.updatedAt ?? null
      setTexto(payload.texto)
      setUpdatedAt(payload.updatedAt)
      if (payload.pacienteNome) setPacienteNome(payload.pacienteNome)
    }

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(PRONTUARIO_LIVE_CHANNEL)
      channel.onmessage = (event: MessageEvent<ProntuarioLivePayload>) => {
        const msg = event.data
        if (!msg || String(msg.pacienteId) !== String(pacienteId)) return
        apply({
          texto: msg.texto ?? '',
          updatedAt: msg.updatedAt,
          pacienteNome: msg.pacienteNome,
        })
      }
    } catch {
      channel = null
    }

    const tick = async () => {
      try {
        const res = await api.get<LiveDraftApi>(
          `/api/prontuarios/live-draft?pacienteId=${encodeURIComponent(String(pacienteId))}`,
        )
        if (cancelled) return
        if (!res.data) return
        apply({
          texto: res.data.texto ?? '',
          updatedAt: res.data.updatedAt,
          pacienteNome: res.data.pacienteNome,
        })
      } catch {
        // silencioso
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), pollMs)

    return () => {
      cancelled = true
      window.clearInterval(id)
      channel?.close()
    }
  }, [api, pacienteId, pollMs])

  return { texto, updatedAt, pacienteNome }
}

/** @deprecated use useProntuarioLivePublish / useProntuarioLiveSubscribe */
export function useProntuarioLiveSync(pacienteId: string | null | undefined, _intervalMs = 8000) {
  void pacienteId
  void _intervalMs
}
