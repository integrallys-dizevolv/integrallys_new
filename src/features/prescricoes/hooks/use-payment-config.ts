'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/use-api'
import type { ApiListResponse } from '@/types/api'

export type CardFees = Record<string, number>
export type PaymentDiscounts = {
  pix: number
  dinheiro: number
  cartao_debito: number
  cartao_credito: number
}

export type Bandeira = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Hipercard' | 'Outros'

export interface MaquininhaConfig {
  bandeiras: Bandeira[]
  taxas_parcelas: { parcelas: number; taxa: number }[]
  taxa_antecipacao: number
  prazo_debito: 'D+1' | 'D+2' | 'D+30'
  prazo_credito_avista: 'D+14' | 'D+30' | 'D+60'
}

const CARD_FEES_KEY = 'pagamento.card_fees'
const PAYMENT_DISCOUNTS_KEY = 'pagamento.payment_discount_config'
const MAQUININHA_KEY = 'pagamento.maquininha'
const CATEGORIA = 'pagamento'

export const DEFAULT_CARD_FEES: CardFees = Object.fromEntries(
  Array.from({ length: 12 }, (_, idx) => [String(idx + 1), 0]),
)

export const DEFAULT_PAYMENT_DISCOUNTS: PaymentDiscounts = {
  pix: 0,
  dinheiro: 0,
  cartao_debito: 0,
  cartao_credito: 0,
}

export const ALL_BANDEIRAS: Bandeira[] = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros']

export const DEFAULT_MAQUININHA: MaquininhaConfig = {
  bandeiras: [],
  taxas_parcelas: Array.from({ length: 12 }, (_, idx) => ({ parcelas: idx + 1, taxa: 0 })),
  taxa_antecipacao: 0,
  prazo_debito: 'D+1',
  prazo_credito_avista: 'D+30',
}

interface ConfiguracaoRow {
  id: string
  chave: string
  valor: string
  categoria: string
}

function parseJsonOrDefault<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeCardFees(raw: unknown): CardFees {
  const base = { ...DEFAULT_CARD_FEES }
  if (!raw || typeof raw !== 'object') return base
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parcel = Number(key)
    const fee = Number(value)
    if (parcel >= 1 && parcel <= 12 && Number.isFinite(fee) && fee >= 0) {
      base[String(parcel)] = fee
    }
  }
  return base
}

function normalizeDiscounts(raw: unknown): PaymentDiscounts {
  const base: PaymentDiscounts = { ...DEFAULT_PAYMENT_DISCOUNTS }
  if (!raw || typeof raw !== 'object') return base
  const source = raw as Record<string, unknown>
  ;(Object.keys(base) as Array<keyof PaymentDiscounts>).forEach((key) => {
    const value = Number(source[key])
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      base[key] = value
    }
  })
  return base
}

function normalizeMaquininha(raw: unknown): MaquininhaConfig {
  const base: MaquininhaConfig = {
    bandeiras: [],
    taxas_parcelas: DEFAULT_MAQUININHA.taxas_parcelas.map((row) => ({ ...row })),
    taxa_antecipacao: 0,
    prazo_debito: DEFAULT_MAQUININHA.prazo_debito,
    prazo_credito_avista: DEFAULT_MAQUININHA.prazo_credito_avista,
  }
  if (!raw || typeof raw !== 'object') return base
  const source = raw as Record<string, unknown>

  if (Array.isArray(source.bandeiras)) {
    const seen = new Set<Bandeira>()
    for (const item of source.bandeiras) {
      if (typeof item === 'string' && (ALL_BANDEIRAS as string[]).includes(item)) {
        seen.add(item as Bandeira)
      }
    }
    base.bandeiras = ALL_BANDEIRAS.filter((b) => seen.has(b))
  }

  if (Array.isArray(source.taxas_parcelas)) {
    const map = new Map<number, number>()
    for (const item of source.taxas_parcelas) {
      if (item && typeof item === 'object') {
        const row = item as { parcelas?: unknown; taxa?: unknown }
        const parcelas = Number(row.parcelas)
        const taxa = Number(row.taxa)
        if (
          Number.isInteger(parcelas) &&
          parcelas >= 1 &&
          parcelas <= 12 &&
          Number.isFinite(taxa) &&
          taxa >= 0 &&
          taxa <= 100
        ) {
          map.set(parcelas, taxa)
        }
      }
    }
    base.taxas_parcelas = base.taxas_parcelas.map((row) =>
      map.has(row.parcelas) ? { parcelas: row.parcelas, taxa: map.get(row.parcelas)! } : row,
    )
  }

  const antecipacao = Number(source.taxa_antecipacao)
  if (Number.isFinite(antecipacao) && antecipacao >= 0 && antecipacao <= 100) {
    base.taxa_antecipacao = antecipacao
  }

  if (source.prazo_debito === 'D+1' || source.prazo_debito === 'D+2' || source.prazo_debito === 'D+30') {
    base.prazo_debito = source.prazo_debito
  }

  if (
    source.prazo_credito_avista === 'D+14' ||
    source.prazo_credito_avista === 'D+30' ||
    source.prazo_credito_avista === 'D+60'
  ) {
    base.prazo_credito_avista = source.prazo_credito_avista
  }

  return base
}

function cardFeesToTaxasParcelas(fees: CardFees): MaquininhaConfig['taxas_parcelas'] {
  return Array.from({ length: 12 }, (_, idx) => {
    const parcelas = idx + 1
    return { parcelas, taxa: fees[String(parcelas)] ?? 0 }
  })
}

function taxasParcelasToCardFees(taxas: MaquininhaConfig['taxas_parcelas']): CardFees {
  const base = { ...DEFAULT_CARD_FEES }
  for (const row of taxas) {
    if (row.parcelas >= 1 && row.parcelas <= 12) {
      base[String(row.parcelas)] = row.taxa
    }
  }
  return base
}

export function usePaymentConfig() {
  const api = useApi()
  const [cardFees, setCardFees] = useState<CardFees>(DEFAULT_CARD_FEES)
  const [paymentDiscounts, setPaymentDiscounts] = useState<PaymentDiscounts>(
    DEFAULT_PAYMENT_DISCOUNTS,
  )
  const [maquininha, setMaquininha] = useState<MaquininhaConfig>(DEFAULT_MAQUININHA)
  const [hasMaquininhaConfig, setHasMaquininhaConfig] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<ApiListResponse<ConfiguracaoRow>>('/api/configuracoes')
        if (!mounted) return
        const items = response.data ?? []
        const cardFeesItem = items.find((row) => row.chave === CARD_FEES_KEY)
        const discountsItem = items.find((row) => row.chave === PAYMENT_DISCOUNTS_KEY)
        const maquininhaItem = items.find((row) => row.chave === MAQUININHA_KEY)

        const cardFeesParsed = normalizeCardFees(parseJsonOrDefault(cardFeesItem?.valor, {}))
        const maquininhaParsed = normalizeMaquininha(parseJsonOrDefault(maquininhaItem?.valor, {}))

        const unifiedTaxas = maquininhaItem
          ? maquininhaParsed.taxas_parcelas
          : cardFeesToTaxasParcelas(cardFeesParsed)

        setCardFees(taxasParcelasToCardFees(unifiedTaxas))
        setMaquininha({ ...maquininhaParsed, taxas_parcelas: unifiedTaxas })
        setHasMaquininhaConfig(Boolean(maquininhaItem))
        setPaymentDiscounts(
          normalizeDiscounts(parseJsonOrDefault(discountsItem?.valor, {})),
        )
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar configuração de pagamento')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [api])

  const saveCardFees = useCallback(
    async (next: CardFees) => {
      const sanitized = normalizeCardFees(next)
      await api.put<ApiListResponse<ConfiguracaoRow>>('/api/configuracoes', [
        {
          categoria: CATEGORIA,
          chave: CARD_FEES_KEY,
          valor: JSON.stringify(sanitized),
        },
      ])
      setCardFees(sanitized)
      return sanitized
    },
    [api],
  )

  const savePaymentDiscounts = useCallback(
    async (next: PaymentDiscounts) => {
      const sanitized = normalizeDiscounts(next)
      await api.put<ApiListResponse<ConfiguracaoRow>>('/api/configuracoes', [
        {
          categoria: CATEGORIA,
          chave: PAYMENT_DISCOUNTS_KEY,
          valor: JSON.stringify(sanitized),
        },
      ])
      setPaymentDiscounts(sanitized)
      return sanitized
    },
    [api],
  )

  const saveMaquininha = useCallback(
    async (next: MaquininhaConfig) => {
      const sanitized = normalizeMaquininha(next)
      const mirroredCardFees = taxasParcelasToCardFees(sanitized.taxas_parcelas)
      await api.put<ApiListResponse<ConfiguracaoRow>>('/api/configuracoes', [
        {
          categoria: CATEGORIA,
          chave: MAQUININHA_KEY,
          valor: JSON.stringify(sanitized),
        },
        {
          categoria: CATEGORIA,
          chave: CARD_FEES_KEY,
          valor: JSON.stringify(mirroredCardFees),
        },
      ])
      setMaquininha(sanitized)
      setCardFees(mirroredCardFees)
      setHasMaquininhaConfig(true)
      return sanitized
    },
    [api],
  )

  const getCardFee = useCallback(
    (parcelas: number) => {
      const key = String(Math.max(1, Math.min(12, Math.floor(parcelas || 1))))
      return cardFees[key] ?? 0
    },
    [cardFees],
  )

  return {
    cardFees,
    paymentDiscounts,
    maquininha,
    hasMaquininhaConfig,
    isLoading,
    error,
    saveCardFees,
    savePaymentDiscounts,
    saveMaquininha,
    getCardFee,
  }
}
