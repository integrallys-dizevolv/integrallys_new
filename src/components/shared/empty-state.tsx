import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { Heading, Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Empty state for tables, lists, or sections with no data.
 * Replaces the inline pattern (rounded panel + centered icon + title + description)
 * found in 5+ features.
 *
 * @example
 *   <EmptyState
 *     icon={Inbox}
 *     title="Nenhum compromisso"
 *     description="Adicione um agendamento para começar."
 *   >
 *     <Button>Novo agendamento</Button>
 *   </EmptyState>
 */
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  /** Slot for action buttons. */
  action?: React.ReactNode
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-integrallys',
        'border border-dashed border-app-border bg-app-bg-secondary/40',
        'px-6 py-12 text-center dark:border-app-border-dark dark:bg-app-card/5',
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-bg-secondary text-app-text-secondary dark:bg-app-hover">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      )}
      <Heading level={4} className="mt-1">
        {title}
      </Heading>
      {description && (
        <Text size="small" tone="secondary" className="max-w-sm">
          {description}
        </Text>
      )}
      {(action ?? children) && <div className="mt-2">{action ?? children}</div>}
    </div>
  ),
)
EmptyState.displayName = 'EmptyState'
