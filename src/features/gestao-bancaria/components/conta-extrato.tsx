'use client'

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, ScrollText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContaBancaria } from '../hooks/use-contas-bancarias'
import { type ContaMovimento, useContaMovimentos } from '../hooks/use-conta-movimentos'

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

// CREDIT (+) ou DEBIT (−); robusto a valor já sinalizado ou não.
const signedValor = (m: ContaMovimento) =>
  m.tipo === 'DEBIT' ? -Math.abs(m.valor) : Math.abs(m.valor)

interface Props {
  conta: ContaBancaria | null
  onClose: () => void
}

export function ContaExtrato({ conta, onClose }: Props) {
  const { movimentos, isLoading, error } = useContaMovimentos(conta?.id ?? null)

  // saldo corrido: ordena asc, acumula a partir do saldo inicial, exibe desc
  const linhas = useMemo(() => {
    const base = conta?.saldoInicial ?? 0
    const asc = [...movimentos].sort((a, b) => {
      const ka = `${a.dataTransacao ?? a.createdAt}#${a.createdAt}`
      const kb = `${b.dataTransacao ?? b.createdAt}#${b.createdAt}`
      return ka < kb ? -1 : ka > kb ? 1 : 0
    })
    let saldo = base
    const comSaldo = asc.map((m) => {
      saldo += signedValor(m)
      return { ...m, saldoApos: saldo }
    })
    return comSaldo.reverse()
  }, [movimentos, conta?.saldoInicial])

  const resumo = [
    { label: 'Saldo inicial', value: formatCurrency(conta?.saldoInicial ?? 0) },
    { label: 'Saldo atual', value: formatCurrency(conta?.saldoAtual ?? 0) },
    { label: 'Movimentos', value: String(conta?.movimentosTotal ?? 0) },
    {
      label: 'Conciliados',
      value: `${conta?.movimentosConciliados ?? 0}/${conta?.movimentosTotal ?? 0}`,
    },
  ]

  const subtitulo =
    [
      conta?.banco,
      conta?.agencia ? `Ag. ${conta.agencia}` : null,
      conta?.conta ? `Cc. ${conta.conta}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || '—'

  return (
    <Dialog
      open={!!conta}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent size="lg" allowOutsideClose className="gap-4">
        <DialogHeader className="pr-8 text-left">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-app-text-secondary dark:text-white/60">
            <ScrollText className="h-3.5 w-3.5" /> Extrato da conta
          </p>
          <DialogTitle className="truncate">{conta?.nome ?? 'Extrato'}</DialogTitle>
          <DialogDescription className="text-app-text-muted">{subtitulo}</DialogDescription>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {resumo.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-app-border/70 bg-app-bg-secondary/40 px-3 py-2 dark:border-app-border-dark dark:bg-white/[0.03]"
            >
              <p className="text-[11px] uppercase tracking-wider text-app-text-muted">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-app-text-primary dark:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div className="overflow-hidden rounded-2xl border border-app-border dark:border-app-border-dark">
          <div className="max-h-[48vh] overflow-y-auto">
            {isLoading ? (
              <div className="divide-y divide-app-border dark:divide-app-border-dark">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 animate-pulse rounded-full bg-app-bg-secondary dark:bg-white/10" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-40 animate-pulse rounded bg-app-bg-secondary dark:bg-white/10" />
                        <div className="h-2.5 w-24 animate-pulse rounded bg-app-bg-secondary dark:bg-white/10" />
                      </div>
                    </div>
                    <div className="h-3 w-20 animate-pulse rounded bg-app-bg-secondary dark:bg-white/10" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--app-danger-text)]">
                {error}
              </p>
            ) : linhas.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-app-text-secondary dark:text-white/70">
                  Nenhum movimento importado nesta conta.
                </p>
                <p className="mt-1 text-xs text-app-text-muted">
                  Use “Importar OFX” para trazer o extrato bancário.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-app-border dark:divide-app-border-dark">
                {linhas.map((m) => {
                  const v = signedValor(m)
                  const entrada = v >= 0
                  const cor = entrada ? 'var(--app-success-text)' : 'var(--app-danger-text)'
                  const Icon = entrada ? ArrowUpRight : ArrowDownLeft
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-app-bg-secondary/40 dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: entrada
                              ? 'var(--app-success-bg)'
                              : 'var(--app-danger-bg)',
                            color: cor,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-app-text-primary dark:text-white">
                            {m.descricao || 'Movimento'}
                          </p>
                          <p className="flex items-center gap-2 text-xs text-app-text-muted">
                            <span className="tabular-nums">{formatDate(m.dataTransacao)}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={
                                m.conciliado
                                  ? {
                                      backgroundColor: 'var(--app-success-bg)',
                                      color: 'var(--app-success-text)',
                                    }
                                  : undefined
                              }
                            >
                              {m.conciliado ? 'Conciliado' : 'Pendente'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums" style={{ color: cor }}>
                          {entrada ? '+' : '−'}
                          {formatCurrency(Math.abs(v))}
                        </p>
                        <p className="text-xs tabular-nums text-app-text-muted">
                          saldo {formatCurrency(m.saldoApos)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
