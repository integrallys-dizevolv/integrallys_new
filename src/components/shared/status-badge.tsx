import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Semantic status badge — pre-configured tones bound to the existing
 * --app-{success,warning,danger,info,neutral}-{bg,text} variables.
 * Replaces inline `rounded-full px-3 py-1 text-xs` patterns repeated 8+ times.
 *
 * @example
 *   <StatusBadge tone="success">Ativo</StatusBadge>
 *   <StatusBadge tone="warning" size="sm">Pendente</StatusBadge>
 */

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium leading-none whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-[color:var(--app-neutral-bg)] text-[color:var(--app-neutral-text)]',
        info: 'bg-[color:var(--app-info-bg)] text-[color:var(--app-info-text)]',
        success: 'bg-[color:var(--app-success-bg)] text-[color:var(--app-success-text)]',
        warning: 'bg-[color:var(--app-warning-bg)] text-[color:var(--app-warning-text)]',
        danger: 'bg-[color:var(--app-danger-bg)] text-[color:var(--app-danger-text)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
      dot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
      dot: false,
    },
  },
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Show a colored dot before the label. */
  dot?: boolean
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, tone, size, dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(statusBadgeVariants({ tone, size, dot }), className)}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  ),
)
StatusBadge.displayName = 'StatusBadge'
