import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; hideDateIcon?: boolean }>(
  ({ className, type, error, hideDateIcon, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full h-11 border rounded-[12px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0 px-4 text-sm shadow-sm",
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)]/20 focus:border-[var(--app-primary)] hover:border-app-hover-strong",
          type === "date" && "[color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert dark:[&::-webkit-calendar-picker-indicator]:brightness-200",
          type === "date" && hideDateIcon && "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:pointer-events-none",
          "dark:bg-app-card-dark dark:text-white dark:placeholder:text-app-text-muted",
          "bg-app-card text-app-text-primary placeholder:text-app-text-muted",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
