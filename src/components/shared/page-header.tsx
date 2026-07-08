import * as React from 'react'
import { Heading, Text } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * Standard page header — title, optional description, optional breadcrumb slot,
 * and optional actions on the right. Replaces the inline pattern repeated 13x
 * across features (h1 + p combo).
 *
 * @example
 *   <PageHeader title="Pacientes" description="Gerencie o cadastro">
 *     <Button>Novo paciente</Button>
 *   </PageHeader>
 */
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  /** Right-aligned actions (buttons, segmented control, etc.) */
  actions?: React.ReactNode
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, breadcrumb, actions, children, className, ...props }, ref) => (
    <header
      ref={ref}
      className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}
      {...props}
    >
      <div className="flex flex-col gap-2">
        {breadcrumb}
        <Heading level={1}>{title}</Heading>
        {description && (
          <Text size="small" tone="secondary" className="max-w-3xl">
            {description}
          </Text>
        )}
      </div>
      {(actions ?? children) && (
        <div className="flex flex-wrap items-center gap-2">{actions ?? children}</div>
      )}
    </header>
  ),
)
PageHeader.displayName = 'PageHeader'
