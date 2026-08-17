import { Button } from '@/components/ui/button'
import { SearchIcon, XIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getSiteInventoryStatusLabel,
  type SiteInventoryStatus,
} from '@/features/site-planning/site-inventory-data'
import {
  siteInventoryErrorMessage,
  type SiteInventoryMapFeature,
} from '@/features/site-planning/site-inventory-api'
import { getSiteInventoryMapIconPath } from '@/features/site-planning/site-inventory-map-layer-options'
import { SiteInventoryStatusBadge } from '@/features/site-planning/site-inventory-status-badge'
import { cn } from '@/lib/utils'

import type {
  TaskSiteFilterOptions,
  TaskSiteFilters,
} from './site-selection-map-task-filters'

type SiteSelectionMapTaskListProps = {
  sites: readonly SiteInventoryMapFeature[]
  filters: TaskSiteFilters
  filterOptions: TaskSiteFilterOptions
  onFiltersChange: (filters: TaskSiteFilters) => void
  selectedSiteId: string | null
  isPending: boolean
  error: unknown | null
  onRetry: () => void
  onSelect: (site: SiteInventoryMapFeature) => void
}

export function SiteSelectionMapTaskList({
  sites,
  filters,
  filterOptions,
  onFiltersChange,
  selectedSiteId,
  isPending,
  error,
  onRetry,
  onSelect,
}: SiteSelectionMapTaskListProps) {
  const hasActiveFilters = Object.values(filters).some(Boolean)
  const orderedSites = [...sites].sort(
    (left, right) => left.properties.sequenceNumber - right.properties.sequenceNumber,
  )

  function updateFilter<Key extends keyof TaskSiteFilters>(
    key: Key,
    value: TaskSiteFilters[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      aria-label="任务站点列表"
    >
      <div className="shrink-0 border-b p-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="bg-background/80 pl-8 pr-8"
            value={filters.query ?? ''}
            maxLength={100}
            placeholder="搜索任务站点或地址"
            aria-label="搜索任务站点"
            onChange={(event) => updateFilter('query', event.target.value)}
          />
          {filters.query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1/2 -translate-y-1/2 active:-translate-y-1/2"
              aria-label="清空任务站点搜索"
              title="清空"
              onClick={() => updateFilter('query', undefined)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <TaskFilterSelect
            label="状态"
            value={filters.status ?? 'all'}
            total={filterOptions.statuses.total}
            options={filterOptions.statuses.options.map((option) => ({
              ...option,
              label: getSiteInventoryStatusLabel(option.value),
            }))}
            onValueChange={(value) => updateFilter(
              'status',
              value === 'all' ? undefined : value as SiteInventoryStatus,
            )}
          />
          <TaskFilterSelect
            label="地区"
            value={filters.city ?? 'all'}
            total={filterOptions.cities.total}
            options={filterOptions.cities.options.map((option) => ({
              ...option,
              label: option.value,
            }))}
            onValueChange={(value) => updateFilter(
              'city',
              value === 'all' ? undefined : value,
            )}
          />
        </div>
      </div>

      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="任务站点加载中">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3 p-2">
            <p className="text-sm text-destructive">
              {siteInventoryErrorMessage(error) ?? '任务站点加载失败，请稍后重试。'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              重新加载
            </Button>
          </div>
        ) : orderedSites.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {hasActiveFilters ? '未找到符合筛选条件的任务站点' : '暂无任务站点'}
          </p>
        ) : (
          <div className="space-y-1 px-2">
            {orderedSites.map((site) => {
              const isSelected = site.id === selectedSiteId
              const isCompleted = site.properties.status === 'completed'
              return (
                <button
                  key={site.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && 'bg-primary/10 ring-1 ring-primary/30 hover:bg-primary/15',
                  )}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(site)}
                >
                  <span className="relative flex size-7 shrink-0 items-center justify-center" aria-hidden="true">
                    <img
                      className="absolute inset-0 size-7"
                      src={getSiteInventoryMapIconPath(site.properties.layerCategory)}
                      alt=""
                      draggable={false}
                    />
                    <span className={cn(
                      'relative font-bold leading-none tabular-nums',
                      site.properties.sequenceNumber > 99 ? 'text-[9px]' : 'text-xs',
                      isCompleted ? 'text-white' : 'text-slate-900',
                    )}>
                      {site.properties.sequenceNumber}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {site.properties.stationName}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <SiteInventoryStatusBadge status={site.properties.status} />
                      <span className="truncate">
                        {[site.properties.provincialCity, site.properties.countyDistrict]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskFilterSelect({
  label,
  value,
  total,
  options,
  onValueChange,
}: {
  label: string
  value: string
  total: number
  options: readonly { value: string; label: string; count: number }[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? 'all')}>
      <SelectTrigger
        size="sm"
        className="w-full min-w-0 bg-background/80"
        aria-label={`按${label}筛选任务站点`}
      >
        <SelectValue>
          {value === 'all'
            ? `${label}：全部`
            : options.find((option) => option.value === value)?.label ?? value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="all">全部（{total}）</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}（{option.count}）
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
