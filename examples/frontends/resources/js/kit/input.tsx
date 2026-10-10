import type * as React from 'react'
import { cn } from './utils.js'

/** A text or number field. Pass `aria-invalid` to mark it wrong. */
export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}
