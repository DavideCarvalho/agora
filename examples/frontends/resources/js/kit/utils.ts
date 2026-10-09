/** Join class names, skipping the falsy ones (a tiny `cn`, so the kit needs no dependency). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
