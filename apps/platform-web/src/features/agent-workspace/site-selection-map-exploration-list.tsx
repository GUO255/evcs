import { SearchIcon, XIcon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  siteExplorationErrorMessage,
  type SiteExplorationFilterQuery,
  type SiteExplorationMapPointFeature,
} from '@/features/site-planning/site-exploration-api'
import {
  getSiteSelectionRecommendationLabel,
  siteExplorationStatusOptions,
  type SiteExplorationFilterOptions,
  type SiteExplorationStatus,
  type SiteSelectionRecommendation,
} from '@/features/site-planning/site-exploration-data'
import { SiteExplorationStatusBadge } from '@/features/site-planning/site-exploration-status-badge'
import { getSiteExplorationStatusConfig } from '@/features/site-planning/site-exploration-status-config'
import {
  formatSiteExplorationArea,
  formatSiteExplorationDistance,
  formatSiteExplorationTraffic,
  formatSiteExplorationUniqueTraffic,
} from '@/features/site-planning/site-exploration-metric-format'
import { getSiteSelectionRecommendationBandByKey } from '@/features/site-planning/site-selection-recommendation-config'
import { cn } from '@/lib/utils'

type SiteSelectionMapExplorationListProps = {
  sites: readonly SiteExplorationMapPointFeature[]
  selectedSiteId: string | null
  isPending: boolean
  error: unknown | null
  onRetry: () => void
  onSelect: (site: SiteExplorationMapPointFeature) => void
  filters: SiteExplorationFilterQuery
  filterOptions: SiteExplorationFilterOptions | null
  filterOptionsPending: boolean
  filterOptionsError: unknown | null
  onFiltersChange: (filters: SiteExplorationFilterQuery) => void
  onRetryFilterOptions: () => void
}

export function SiteSelectionMapExplorationList({
  sites,
  selectedSiteId,
  isPending,
  error,
  onRetry,
  onSelect,
  filters,
  filterOptions,
  filterOptionsPending,
  filterOptionsError,
  onFiltersChange,
  onRetryFilterOptions,
}: SiteSelectionMapExplorationListProps) {
  const projectPrefix = filters.projectPrefix ?? ''
  const hasActiveFilters = Object.values(filters).some(Boolean)
  const siteGroups = groupSitesByExplorationDate(sites)

  function updateFilter<Key extends keyof SiteExplorationFilterQuery>(
    key: Key,
    value: SiteExplorationFilterQuery[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      aria-label="勘探站点列表"
    >
      <div className="shrink-0 border-b p-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="bg-background/80 pl-8 pr-8"
            value={projectPrefix}
            maxLength={128}
            placeholder="按项目名称前缀搜索"
            aria-label="按项目名称前缀搜索勘探站点"
            onChange={(event) => updateFilter('projectPrefix', event.target.value)}
          />
          {projectPrefix ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-1 top-1/2 -translate-y-1/2 active:-translate-y-1/2"
              aria-label="清空勘探站点搜索"
              title="清空"
              onClick={() => updateFilter('projectPrefix', undefined)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        {filterOptionsError ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-destructive/5 px-2 py-1.5">
            <span className="truncate text-xs text-destructive">
              {siteExplorationErrorMessage(filterOptionsError) ?? '筛选项加载失败'}
            </span>
            <Button type="button" variant="ghost" size="xs" onClick={onRetryFilterOptions}>
              重试
            </Button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-1.5" aria-busy={filterOptionsPending}>
            <ExplorationFilterSelect
              label="状态"
              value={filters.status ?? 'all'}
              total={filterOptions?.statuses.total ?? 0}
              disabled={filterOptionsPending || !filterOptions}
              options={(filterOptions?.statuses.options ?? []).map((option) => ({
                value: option.value,
                label: siteExplorationStatusOptions.find(({ value }) => value === option.value)?.label
                  ?? option.value,
                count: option.count,
              }))}
              onValueChange={(value) => updateFilter(
                'status',
                value === 'all' ? undefined : value as SiteExplorationStatus,
              )}
            />
            {filterOptions?.canFilterByTeam ? (
              <ExplorationFilterSelect
                label="小组"
                value={filters.team ?? 'all'}
                total={filterOptions.teams.total}
                options={filterOptions.teams.options.map((option) => ({
                  ...option,
                  label: option.value,
                }))}
                onValueChange={(value) => updateFilter(
                  'team',
                  value === 'all' ? undefined : value,
                )}
              />
            ) : null}
            <ExplorationFilterSelect
              label="勘探人"
              value={filters.explorer ?? 'all'}
              total={filterOptions?.explorers.total ?? 0}
              disabled={filterOptionsPending || !filterOptions}
              options={(filterOptions?.explorers.options ?? []).map((option) => ({
                ...option,
                label: option.value,
              }))}
              onValueChange={(value) => updateFilter(
                'explorer',
                value === 'all' ? undefined : value,
              )}
            />
            <ExplorationFilterSelect
              label="地区"
              value={filters.city ?? 'all'}
              total={filterOptions?.cities.total ?? 0}
              disabled={filterOptionsPending || !filterOptions}
              options={(filterOptions?.cities.options ?? []).map((option) => ({
                ...option,
                label: option.value,
              }))}
              onValueChange={(value) => updateFilter(
                'city',
                value === 'all' ? undefined : value,
              )}
            />
            <ExplorationFilterSelect
              label="路线"
              value={filters.route ?? 'all'}
              total={filterOptions?.routes.total ?? 0}
              disabled={filterOptionsPending || !filterOptions}
              options={(filterOptions?.routes.options ?? []).map((option) => ({
                ...option,
                label: option.value,
              }))}
              onValueChange={(value) => updateFilter(
                'route',
                value === 'all' ? undefined : value,
              )}
            />
          </div>
        )}
      </div>

      <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="space-y-2" aria-busy="true" aria-label="勘探站点加载中">
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
              {siteExplorationErrorMessage(error)
                ?? '勘探站点列表加载失败，请稍后重试。'}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              重新加载
            </Button>
          </div>
        ) : sites.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {hasActiveFilters ? '未找到符合筛选条件的勘探站点' : '暂无可定位的勘探站点'}
          </p>
        ) : (
          <div className="space-y-2">
            {siteGroups.map((group) => (
              <section
                key={group.explorationDate}
                aria-labelledby={`exploration-date-${group.explorationDate}`}
              >
                <h3
                  id={`exploration-date-${group.explorationDate}`}
                  className="sticky top-0 z-10 flex items-center justify-between bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <span className="tabular-nums">{group.explorationDate}</span>
                  <span>{group.sites.length} 个站点</span>
                </h3>
                <div className="space-y-1 px-1 pt-2">
                  {group.sites.map((site) => {
                    const isSelected = site.id === selectedSiteId
                    return (
                      <button
                        key={site.id}
                        type="button"
                        className={cn(
                          'flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'bg-primary/10 ring-1 ring-primary/30 hover:bg-primary/15',
                        )}
                        aria-pressed={isSelected}
                        onClick={() => onSelect(site)}
                      >
                        <ExplorationSiteMarkerIcon
                          status={site.properties.status}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-medium"
                            title={site.properties.projectName}
                          >
                            {site.properties.projectName}
                          </span>
                          <span className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <SiteExplorationStatusBadge status={site.properties.status} />
                            {site.properties.hasAnalysis ? (
                              <ExplorationAnalysisRecommendation
                                recommendation={site.properties.selectionRecommendation}
                              />
                            ) : null}
                            <span className="truncate">
                              {site.properties.provinceCity} · {site.properties.countyDistrict}
                            </span>
                          </span>
                          <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-xs">
                            <ExplorationMetric
                              label="最近道路"
                              value={site.properties.nearestRoadName ?? '—'}
                            />
                            <ExplorationMetric
                              label="主干距离"
                              value={formatSiteExplorationDistance(site.properties.arterialRoadDistanceMeters)}
                            />
                            <ExplorationMetric
                              label="车流量"
                              value={formatSiteExplorationTraffic(site.properties.trafficVisitCount)}
                            />
                            <ExplorationMetric
                              label="去重车流"
                              value={formatSiteExplorationUniqueTraffic(site.properties.uniqueTrafficVehicleCount)}
                            />
                            <ExplorationMetric
                              label="周边充电站"
                              value={`${site.properties.nearbyChargingStationCount} 个`}
                            />
                            <ExplorationMetric
                              label="周边热点"
                              value={`${site.properties.nearbyHotspotAreaCount} 个`}
                            />
                            <ExplorationMetric
                              label="高速距离"
                              value={formatSiteExplorationDistance(site.properties.highwayDistanceMeters)}
                            />
                            <ExplorationMetric
                              label="场站面积"
                              value={formatSiteExplorationArea(site.properties.siteAreaSquareMeters)}
                            />
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExplorationMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 items-baseline justify-between gap-1">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground" title={`${label}：${value}`}>
        {value}
      </span>
    </span>
  )
}

function ExplorationFilterSelect({
  label,
  value,
  total,
  options,
  disabled = false,
  onValueChange,
}: {
  label: string
  value: string
  total: number
  options: readonly { value: string; label: string; count: number }[]
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? 'all')}>
      <SelectTrigger
        size="sm"
        className="w-full min-w-0 bg-background/80"
        disabled={disabled}
        aria-label={`按${label}筛选勘探站点`}
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

function groupSitesByExplorationDate(sites: readonly SiteExplorationMapPointFeature[]) {
  const groups = new Map<string, SiteExplorationMapPointFeature[]>()
  for (const site of sites) {
    const explorationDate = site.properties.explorationDate
    const group = groups.get(explorationDate)
    if (group) group.push(site)
    else groups.set(explorationDate, [site])
  }
  return Array.from(groups, ([explorationDate, groupedSites]) => ({
    explorationDate,
    sites: groupedSites,
  })).sort((left, right) => right.explorationDate.localeCompare(left.explorationDate))
}

function ExplorationSiteMarkerIcon({ status }: {
  status: SiteExplorationStatus
}) {
  const config = getSiteExplorationStatusConfig(status)
  return (
    <span className="relative size-6 shrink-0" aria-hidden="true">
      <img
        className="absolute inset-0 size-full object-contain"
        src={config.iconPath}
        alt=""
        draggable={false}
      />
    </span>
  )
}

function ExplorationAnalysisRecommendation({ recommendation }: {
  recommendation: SiteSelectionRecommendation
}) {
  const band = recommendation === '' || recommendation === 'needs-review'
    ? null
    : getSiteSelectionRecommendationBandByKey(recommendation)
  return (
    <Badge
      variant={band ? 'outline' : 'secondary'}
      className={cn('shrink-0 gap-1 pl-1 pr-1.5', band?.badgeClassName)}
    >
      <img
        src="/agent-avatars/robot/evaluation-summary.webp"
        alt=""
        className="size-4 rounded-full border bg-muted object-cover"
        draggable={false}
      />
      {getSiteSelectionRecommendationLabel(recommendation)}
    </Badge>
  )
}
