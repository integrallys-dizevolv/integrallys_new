import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Layout wrapper for filter rows — search input, dropdowns, "Limpar filtros" button.
 * Replaces the inline `flex flex-col gap-3 lg:flex-row lg:items-center` pattern
 * repeated 4+ times.
 *
 * Slot-based: just compose children. The component handles only spacing/layout.
 *
 * @example
 *   <FilterBar>
 *     <SearchInput />
 *     <Select>...</Select>
 *     <FilterBar.Spacer />
 *     <Button variant="ghost">Limpar</Button>
 *   </FilterBar>
 */
export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-3 rounded-integrallys-lg border border-app-border',
        'bg-app-card p-3 dark:border-app-border-dark dark:bg-app-card-dark',
        'lg:flex-row lg:flex-wrap lg:items-center',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
) as React.ForwardRefExoticComponent<
  FilterBarProps & React.RefAttributes<HTMLDivElement>
> & {
  Spacer: typeof FilterBarSpacer
}
FilterBar.displayName = 'FilterBar'

const FilterBarSpacer = () => <div className="lg:ml-auto" aria-hidden />
FilterBar.Spacer = FilterBarSpacer
