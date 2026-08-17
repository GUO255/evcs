import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { LoaderCircleIcon, SearchIcon, XIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import {
  searchTiandituLocations,
  tiandituLocationSearchErrorMessage,
  type TiandituLocationSearchResult,
} from './tianditu-location-search'

export function TiandituLocationCommand({
  token,
  selectedResultId,
  open,
  className,
  formClassName,
  listClassName,
  overlayResults = false,
  closeOnSelect = false,
  onOpenChange,
  onResultsChange,
  onSelect,
}: {
  token: string
  selectedResultId: string | null
  open?: boolean
  className?: string
  formClassName?: string
  listClassName?: string
  overlayResults?: boolean
  closeOnSelect?: boolean
  onOpenChange?: (open: boolean) => void
  onResultsChange?: (results: readonly TiandituLocationSearchResult[]) => void
  onSelect: (result: TiandituLocationSearchResult) => void
}) {
  const abortRef = useRef<AbortController | null>(null)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<TiandituLocationSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isOpen = open ?? uncontrolledOpen

  useEffect(() => () => abortRef.current?.abort(), [])

  function changeOpen(open: boolean) {
    setUncontrolledOpen(open)
    onOpenChange?.(open)
  }

  function resetSearch() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsSearching(false)
    setResults([])
    setError(null)
    changeOpen(false)
    onResultsChange?.([])
  }

  function changeKeyword(value: string) {
    resetSearch()
    setKeyword(value)
  }

  function clearSearch() {
    resetSearch()
    setKeyword('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      changeOpen(false)
      return
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    const canSelectResult = isOpen && !isSearching && !error && results.length > 0
    if (canSelectResult) return

    event.preventDefault()
    event.stopPropagation()
    if (!isSearching) event.currentTarget.form?.requestSubmit()
  }

  function selectResult(result: TiandituLocationSearchResult) {
    onSelect(result)
    if (closeOnSelect) changeOpen(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const normalizedKeyword = keyword.trim()
    if (!normalizedKeyword) {
      setResults([])
      setError('请输入位置关键词。')
      changeOpen(true)
      onResultsChange?.([])
      return
    }
    if (!token) {
      setResults([])
      setError('天地图位置搜索未配置。')
      changeOpen(true)
      onResultsChange?.([])
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setResults([])
    setError(null)
    setIsSearching(true)
    changeOpen(true)
    onResultsChange?.([])
    try {
      const nextResults = await searchTiandituLocations({
        keyword: normalizedKeyword,
        token,
        signal: controller.signal,
      })
      if (abortRef.current !== controller) return
      setResults(nextResults)
      onResultsChange?.(nextResults)
    } catch (searchError) {
      if (abortRef.current !== controller) return
      const message = tiandituLocationSearchErrorMessage(searchError)
      if (message) setError(message)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setIsSearching(false)
      }
    }
  }

  return (
    <form
      role="search"
      className={cn('relative', overlayResults && 'z-20', formClassName)}
      onSubmit={(event) => void submit(event)}
    >
      <Command
        shouldFilter={false}
        className={cn(
          'h-auto! w-full rounded-lg border bg-card/95 p-0 shadow-sm backdrop-blur',
          overlayResults && 'overflow-visible',
          className,
        )}
      >
        <div className="flex items-start gap-1 pr-1 pb-1">
          <div className="relative min-w-0 flex-1">
            <CommandInput
              value={keyword}
              onValueChange={changeKeyword}
              onKeyDown={handleKeyDown}
              className="pr-8"
              placeholder="搜索河南省内位置"
              aria-label="搜索河南省内位置"
              aria-expanded={isOpen}
            />
            {keyword ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute right-1 top-2 active:translate-y-0"
                aria-label="清空位置搜索"
                title="清空"
                onClick={clearSearch}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="mt-1"
            disabled={isSearching || !keyword.trim()}
            aria-label="搜索位置"
            title="搜索（Enter）"
          >
            {isSearching
              ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              : <SearchIcon aria-hidden="true" />}
          </Button>
        </div>
        {isOpen ? (
          <CommandList
            className={cn(
              'min-h-0 border-t bg-card py-1',
              overlayResults && 'absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 rounded-lg border shadow-md',
              listClassName,
            )}
            aria-live="polite"
          >
            {isSearching ? (
              <div className="flex flex-col gap-2 p-2" aria-label="正在搜索河南省内位置" aria-busy="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <CommandEmpty className="px-3 text-destructive" role="alert">{error}</CommandEmpty>
            ) : results.length === 0 ? (
              <CommandEmpty>未找到相关位置</CommandEmpty>
            ) : (
              <CommandGroup heading={`河南省搜索结果（${results.length}）`}>
                {results.map((result, index) => (
                  <CommandItem
                    key={result.id}
                    value={result.id}
                    className="items-start py-2"
                    data-checked={selectedResultId === result.id}
                    onSelect={() => selectResult(result)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.6875rem] font-semibold text-primary-foreground',
                        selectedResultId === result.id && 'ring-2 ring-ring ring-offset-2',
                      )}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.name}</span>
                      {result.address ? (
                        <span className="block truncate text-xs text-muted-foreground">{result.address}</span>
                      ) : null}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        ) : null}
      </Command>
    </form>
  )
}
