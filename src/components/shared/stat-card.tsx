import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { Caption, Heading, Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Canonical stat card — icon + caption label + value + optional sub.
 * Replaces the inline pattern repeated across features.
 *
 * @example
 *   <StatCard
 *     label="Receita do mês"
 *     value="R$ 42.300,00"
 *     sub="+12% vs mês anterior"
 *     icon={DollarSign}
 *     iconTone="success"
 *   />
 */

const iconWrapVariants = cva(
  'flex h-10 w-10 items-center justify-center rounded-2xl shrink-0',
  {
    variants: {
      iconTone: {
        neutral: 'bg-app-bg-secondary text-app-text-secondary dark:bg-app-hover',
        primary: 'bg-[color:var(--app-info-bg)] text-[color:var(--app-info-text)]',
        success: 'bg-[color:var(--app-success-bg)] text-[color:var(--app-success-text)]',
        warning: 'bg-[color:var(--app-warning-bg)] text-[color:var(--app-warning-text)]',
        danger: 'bg-[color:var(--app-danger-bg)] text-[color:var(--app-danger-text)]',
      },
    },
    defaultVariants: { iconTone: 'neutral' },
  },
)

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof iconWrapVariants> {
  label: React.ReactNode
  value: React.ReactNode
  /** Subtext shown below the value (delta, comparison, hint, etc.) */
  sub?: React.ReactNode
  icon?: LucideIcon
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, sub, icon: Icon, iconTone, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-3 rounded-integrallys-lg border border-app-border bg-app-card p-5',
        'dark:border-app-border-dark dark:bg-app-card-dark',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <Caption>{label}</Caption>
        {Icon && (
          <div className={iconWrapVariants({ iconTone })}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <Heading level={2} as="h2" className="tabular-nums">
        {value}
      </Heading>
      {sub && (
        <Text size="small" tone="secondary">
          {sub}
        </Text>
      )}
    </div>
  ),
)
StatCard.displayName = 'StatCard'
