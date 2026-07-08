import type { LucideIcon } from 'lucide-react'
import { ShieldAlert } from 'lucide-react'
import * as React from 'react'
import { Heading, Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Access-denied state for pages/sections the current profile cannot view.
 *
 * Deliberately DISTINCT from `EmptyState`:
 *   - EmptyState  = "há um lugar para dados, mas está vazio" → borda tracejada +
 *     call-to-action para cadastrar o primeiro item.
 *   - AcessoNegado = "existe conteúdo, mas você não pode vê-lo" → card sólido,
 *     tom de aviso e SEM call-to-action.
 *
 * Renderize este componente NO LUGAR do EmptyState/tabela quando a API responder
 * 403 (`FORBIDDEN`), para não misturar "nenhum cadastrado" com "acesso negado".
 *
 * @example
 *   {accessDenied ? <AcessoNegadoState /> : <Tabela ... />}
 */
export interface AcessoNegadoStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: LucideIcon
  title?: React.ReactNode
  description?: React.ReactNode
}

export const AcessoNegadoState = React.forwardRef<HTMLDivElement, AcessoNegadoStateProps>(
  (
    {
      icon: Icon = ShieldAlert,
      title = 'Você não tem acesso a esta área',
      description = 'Seu perfil não tem permissão para visualizar esta seção. Se você acredita que deveria ter acesso, fale com um administrador.',
      className,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-integrallys',
        'border border-app-border bg-app-card px-6 py-16 text-center shadow-sm',
        'dark:border-app-border-dark dark:bg-app-card-dark',
        className,
      )}
      {...props}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--app-warning-bg)] text-[color:var(--app-warning-text)]">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <Heading level={3} className="mt-1">
        {title}
      </Heading>
      {description && (
        <Text size="small" tone="secondary" className="max-w-md">
          {description}
        </Text>
      )}
    </div>
  ),
)
AcessoNegadoState.displayName = 'AcessoNegadoState'
