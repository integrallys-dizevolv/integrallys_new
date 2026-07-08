import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Modal header with optional icon — wraps shadcn DialogHeader.
 * Replaces the inline pattern (icon panel + DialogTitle + DialogDescription)
 * repeated 6+ times in financial and other modals.
 *
 * @example
 *   <Dialog>
 *     <DialogContent>
 *       <ModalHeader
 *         icon={CreditCard}
 *         title="Novo lançamento"
 *         description="Adicione uma movimentação financeira."
 *       />
 *       ...
 *     </DialogContent>
 *   </Dialog>
 */
export interface ModalHeaderProps
  extends Omit<React.ComponentProps<typeof DialogHeader>, 'title'> {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
}

export function ModalHeader({
  icon: Icon,
  title,
  description,
  className,
  ...props
}: ModalHeaderProps) {
  return (
    <DialogHeader className={cn('gap-3', className)} {...props}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-bg-secondary text-app-text-secondary dark:bg-app-hover">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-xl font-semibold tracking-tight leading-tight">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-app-text-secondary">
              {description}
            </DialogDescription>
          )}
        </div>
      </div>
    </DialogHeader>
  )
}
