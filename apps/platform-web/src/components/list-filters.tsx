import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { SearchIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface ListFilterOption<Value extends string> {
  value: Value
  label: string
}

export function countListFilterValues<Item, Value extends string>(
  items: readonly Item[],
  getValue: (item: Item) => Value,
): Partial<Record<Value | 'all', number>> {
  const counts = { all: items.length } as Partial<
    Record<Value | 'all', number>
  >

  for (const item of items) {
    const value = getValue(item)
    counts[value] = (counts[value] ?? 0) + 1
  }

  return counts
}

export function ListFilters({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[5rem_minmax(0,1fr)] sm:items-center">
      {children}
    </div>
  )
}

export function ListFilterRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <span className="text-sm font-medium">{label}</span>
      <div className="min-w-0">{children}</div>
    </>
  )
}

export function ListFilterOptionGroup<Value extends string>({
  ariaLabel,
  options,
  value,
  counts,
  hideAllCount = false,
  onValueChange,
}: {
  ariaLabel: string
  options: readonly ListFilterOption<Value>[]
  value: Value
  counts?: Readonly<Partial<Record<Value, number>>>
  hideAllCount?: boolean
  onValueChange: (value: Value) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const showCount = counts && !(hideAllCount && option.value === 'all')
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={option.value === value ? 'default' : 'outline'}
            aria-pressed={option.value === value}
            onClick={() => onValueChange(option.value)}
          >
            <span>
              {showCount
                ? `${option.label}（${counts[option.value] ?? 0}）`
                : option.label}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

export function ListSearchField({
  value,
  placeholder,
  ariaLabel,
  onInputChange,
  onValueChange,
}: {
  value: string
  placeholder: string
  ariaLabel: string
  onInputChange?: (value: string) => void
  onValueChange: (value: string) => void
}) {
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onValueChange(draftValue.trim())
  }

  return (
    <form
      role="search"
      className="flex w-full items-center gap-2"
      onSubmit={submitSearch}
    >
      <div className="relative min-w-0 flex-1 sm:max-w-xl">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={draftValue}
          onChange={(event) => {
            setDraftValue(event.target.value)
            onInputChange?.(event.target.value)
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </div>
      <Button type="submit" variant="secondary">
        <SearchIcon data-icon="inline-start" />
        搜索
      </Button>
    </form>
  )
}
