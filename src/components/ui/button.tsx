import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-integrallys focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-app-primary hover:bg-app-primary-hover text-white",
        default: "bg-app-primary hover:bg-app-primary-hover text-white",
        secondary:
          "bg-app-bg-secondary hover:bg-app-hover text-app-text-primary dark:bg-app-card/60 dark:hover:bg-app-hover dark:text-white",
        ghost:
          "bg-transparent hover:bg-app-hover text-app-text-primary dark:hover:bg-app-hover dark:text-white",
        outline:
          "border border-app-border dark:border-app-border-dark bg-transparent hover:bg-app-hover dark:hover:bg-app-hover text-app-text-primary dark:text-white",
        destructive: "bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white",
        link: "text-[var(--app-primary)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-12 px-6 text-base",
        default: "h-12 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
