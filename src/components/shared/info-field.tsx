import * as React from 'react'
import { Caption, Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Display-only label/value field — used inside detail panels and modals.
 * Replaces the inline pattern (uppercase caption + value in a soft card)
 * repeated 11x.
 *
 * @example
 *   <InfoField label="Status" value="Ativo" />
 *   <InfoField label="Convênio">
 *     <StatusBadge tone="success">Premium</StatusBadge>
 *   </InfoField>
 */
export interface InfoFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  value?: React.ReactNode
  /** When true renders without the soft surface — just label + value. */
  inline?: boolean
}

export const InfoField = React.forwardRef<HTMLDivElement, InfoFieldProps>(
  ({ label, value, inline, children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1.5',
        !inline &&
          'rounded-integrallys border border-app-border bg-app-bg-secondary/50 p-3 dark:border-app-border-dark dark:bg-app-card/5',
        className,
      )}
      {...props}
    >
      <Caption>{label}</Caption>
      {children ?? (
        <Text size="small" tone="default">
          {value}
        </Text>
      )}
    </div>
  ),
)
InfoField.displayName = 'InfoField'
