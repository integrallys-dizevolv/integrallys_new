import { createElement } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Retorna classes CSS para badge de status em qualquer domínio.
 * Portado e adaptado de src/utils/statusBadges.ts do projeto original.
 */
export function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase()

  if (
    s.includes('ativo') || s.includes('ativa') || s.includes('concluí') ||
    s.includes('concluido') || s.includes('check-out') || s.includes('pago') ||
    s.includes('aprovado') || s.includes('confirmado') || s.includes('disponí') ||
    s.includes('disponivel') || s.includes('online')
  ) {
    return 'bg-[var(--app-success-text)] dark:bg-emerald-900 text-white dark:text-[var(--app-success-text)] border-none font-normal'
  }

  if (
    s.includes('pendente') || s.includes('agendado') || s.includes('confirmaç') ||
    s.includes('confirmacao') || s.includes('check-in') || s.includes('aguardando')
  ) {
    return 'bg-app-primary dark:bg-blue-900 text-white dark:text-[var(--app-info-text)] border-none font-normal'
  }

  if (
    s.includes('andamento') || s.includes('atendimento') || s.includes('processando') ||
    s.includes('em análise') || s.includes('em analise')
  ) {
    return 'bg-[var(--app-info-text)] dark:bg-purple-900 text-white dark:text-purple-100 border-none font-normal'
  }

  if (
    s.includes('atraso') || s.includes('parcial') || s.includes('em aberto') ||
    s.includes('vencendo') || s.includes('atenç') || s.includes('manutençã')
  ) {
    return 'bg-amber-600 dark:bg-amber-900 text-white dark:text-[var(--app-warning-text)] border-none font-normal'
  }

  if (
    s.includes('cancelado') || s.includes('inativo') || s.includes('inativa') ||
    s.includes('recusado') || s.includes('erro') || s.includes('falha') ||
    s.includes('bloqueado') || s.includes('não compareceu') || s.includes('ocupado')
  ) {
    return 'bg-[var(--app-danger-text)] dark:bg-red-900 text-white dark:text-[var(--app-danger-text)] border-none font-normal'
  }

  return 'bg-gray-600 dark:bg-app-card-dark text-white dark:text-gray-200 border-none font-normal'
}

export function formatStatusText(status: string): string {
  if (!status) return ''
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

interface StatusBadgeProps {
  status: string
  className?: string
}

/**
 * UI-13: componente centralizado de Badge de status. Combina `Badge` (variant
 * outline pra herdar a forma da pill) com `getStatusBadgeClass` (cores por
 * família semântica). `twMerge` resolve os conflitos — as classes de
 * `getStatusBadgeClass` sobrescrevem a `outline` (bg-color > bg-transparent,
 * border-none > border-app-border).
 *
 * NOTA: este arquivo é `.ts` (sem JSX) pra manter a constraint "não criar
 * arquivos novos". Usamos `createElement` em vez de JSX direto.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return createElement(
    Badge,
    {
      variant: 'outline',
      className: cn(getStatusBadgeClass(status), className),
    },
    status,
  )
}
