import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "app-pill inline-flex items-center rounded-full text-xs font-normal border shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-app-primary text-white border-transparent",
        secondary:
          "bg-app-bg-secondary dark:bg-app-hover text-app-text-primary dark:text-white border-transparent",
        outline:
          "border-app-border dark:border-app-border-dark bg-transparent text-app-text-primary dark:text-white",
        destructive:
          "bg-[var(--app-danger-text)] dark:bg-red-900 text-white dark:text-[var(--app-danger-text)] border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
