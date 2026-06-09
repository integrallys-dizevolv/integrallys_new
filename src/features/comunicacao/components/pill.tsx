import type { ReactNode } from 'react'

const TONES = {
  success: 'bg-[var(--app-success-bg)] text-[var(--app-success-text)]',
  danger: 'bg-[var(--app-danger-bg)] text-[var(--app-danger-text)]',
  warning: 'bg-[var(--app-warning-bg)] text-[var(--app-warning-text)]',
  info: 'bg-[var(--app-info-bg)] text-[var(--app-info-text)]',
  neutral: 'bg-[var(--app-neutral-bg)] text-[var(--app-neutral-text)]',
} as const

export type PillTone = keyof typeof TONES

/** Pílula de status reutilizável — substitui as 4 funções de badge do módulo. */
export function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]}`}>{children}</span>
  )
}

/** snake_case / código interno → texto legível ("coletando_nome" → "Coletando nome"). */
export function humanize(value: string) {
  if (!value) return '—'
  const text = value.replace(/_/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
