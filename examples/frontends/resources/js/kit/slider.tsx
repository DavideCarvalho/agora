import { cn } from './utils.js'

export interface SliderProps {
  /** The current value, as a one-element array (`[3]`). */
  value: number[]
  /** Called with the new value (`[4]`) while it moves. */
  onValueChange?: (value: number[]) => void
  /** @default 0 */
  min?: number
  /** @default 100 */
  max?: number
  /** @default 1 */
  step?: number
  /** Its accessible name. */
  'aria-label'?: string
  className?: string
}

/** A range slider in the app's colors. */
export function Slider({ value, onValueChange, min = 0, max = 100, step = 1, className, ...rest }: SliderProps) {
  return (
    <input
      data-slot="slider"
      type="range"
      aria-label={rest['aria-label']}
      className={cn('h-2 w-full cursor-pointer accent-primary', className)}
      min={min}
      max={max}
      step={step}
      value={value[0] ?? min}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
    />
  )
}
