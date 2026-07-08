import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Typography primitives — single source of truth for text hierarchy.
 *
 * Hierarchy (display sizes):
 *   h1 →  text-3xl  font-semibold tracking-tight
 *   h2 →  text-2xl  font-semibold tracking-tight
 *   h3 →  text-xl   font-medium   tracking-tight
 *   h4 →  text-lg   font-medium
 *
 * Body sizes:
 *   lead    → text-lg   leading-relaxed
 *   body    → text-base
 *   small   → text-sm
 *   caption → text-xs uppercase tracking-wider font-medium (micro-labels)
 *
 * Tones drive color via the existing --app-text-* variables.
 */

const headingVariants = cva('text-app-text-primary', {
  variants: {
    level: {
      1: 'text-3xl font-semibold tracking-tight leading-tight',
      2: 'text-2xl font-semibold tracking-tight leading-tight',
      3: 'text-xl font-medium tracking-tight leading-snug',
      4: 'text-lg font-medium leading-snug',
    },
    tone: {
      default: 'text-app-text-primary',
      muted: 'text-app-text-secondary',
      accent: 'text-app-primary',
    },
  },
  defaultVariants: {
    level: 1,
    tone: 'default',
  },
})

type HeadingLevel = 1 | 2 | 3 | 4
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4'

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>,
    VariantProps<typeof headingVariants> {
  level?: HeadingLevel
  as?: HeadingTag
  asChild?: boolean
  children?: React.ReactNode
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, tone, as, asChild, ...props }, ref) => {
    const Tag: HeadingTag = as ?? (`h${level}` as HeadingTag)
    const Comp = asChild ? Slot : Tag
    return (
      <Comp
        ref={ref}
        className={cn(headingVariants({ level, tone }), className)}
        {...props}
      />
    )
  },
)
Heading.displayName = 'Heading'

const textVariants = cva('', {
  variants: {
    size: {
      lead: 'text-lg leading-relaxed',
      body: 'text-base leading-normal',
      small: 'text-sm leading-normal',
      tiny: 'text-xs leading-normal',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    tone: {
      default: 'text-app-text-primary',
      secondary: 'text-app-text-secondary',
      muted: 'text-app-text-muted',
      accent: 'text-app-primary',
      danger: 'text-[color:var(--app-danger-text)]',
      success: 'text-[color:var(--app-success-text)]',
      warning: 'text-[color:var(--app-warning-text)]',
    },
  },
  defaultVariants: {
    size: 'body',
    weight: 'normal',
    tone: 'default',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div'
  asChild?: boolean
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, size, weight, tone, as = 'p', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : as
    return (
      <Comp
        ref={ref}
        className={cn(textVariants({ size, weight, tone }), className)}
        {...props}
      />
    )
  },
)
Text.displayName = 'Text'

/**
 * Caption — micro-labels for stat cards, table headers, metadata.
 * Replaces the scattered tiny-uppercase-tracking-wider pattern.
 */
export const Caption = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { tone?: 'default' | 'muted' | 'secondary' }
>(({ className, tone = 'muted', ...props }, ref) => {
  const toneClass =
    tone === 'default'
      ? 'text-app-text-primary'
      : tone === 'secondary'
        ? 'text-app-text-secondary'
        : 'text-app-text-muted'
  return (
    <span
      ref={ref}
      className={cn(
        'text-xs font-medium uppercase tracking-wider leading-none',
        toneClass,
        className,
      )}
      {...props}
    />
  )
})
Caption.displayName = 'Caption'

/**
 * Numeric — for displaying numbers, IDs, and tabular data with proper figures.
 * Uses tabular-nums to keep digits aligned in tables.
 */
export const Numeric = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { mono?: boolean }
>(({ className, mono, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'tabular-nums',
      mono && 'font-mono',
      className,
    )}
    {...props}
  />
))
Numeric.displayName = 'Numeric'
