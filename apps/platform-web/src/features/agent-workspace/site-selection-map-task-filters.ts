import type { SiteInventoryStatus } from '@/features/site-planning/site-inventory-data'
import type { SiteInventoryMapFeature } from '@/features/site-planning/site-inventory-api'

export type TaskSiteFilters = {
  query?: string
  status?: SiteInventoryStatus
  city?: string
}

type FilterOption<Value extends string = string> = { value: Value; count: number }

export type TaskSiteFilterOptions = {
  statuses: { total: number; options: FilterOption<SiteInventoryStatus>[] }
  cities: { total: number; options: FilterOption[] }
}

export function filterTaskSites(
  sites: readonly SiteInventoryMapFeature[],
  filters: TaskSiteFilters,
): SiteInventoryMapFeature[] {
  return sites.filter((site) => matchesFilters(site, filters))
}

export function createTaskSiteFilterOptions(
  sites: readonly SiteInventoryMapFeature[],
  filters: TaskSiteFilters,
): TaskSiteFilterOptions {
  const statusSites = sites.filter((site) => matchesFilters(site, filters, 'status'))
  const citySites = sites.filter((site) => matchesFilters(site, filters, 'city'))
  return {
    statuses: {
      total: statusSites.length,
      options: countOptions(
        statusSites,
        (site) => site.properties.status,
        ['incomplete', 'completed'],
      ),
    },
    cities: {
      total: citySites.length,
      options: countOptions(citySites, (site) => site.properties.provincialCity),
    },
  }
}

function matchesFilters(
  site: SiteInventoryMapFeature,
  filters: TaskSiteFilters,
  ignored?: Exclude<keyof TaskSiteFilters, 'query'>,
): boolean {
  const properties = site.properties
  const query = filters.query?.trim().toLocaleLowerCase('zh-CN') ?? ''
  if (query && ![
    String(properties.sequenceNumber),
    properties.stationName,
    properties.provincialCity,
    properties.countyDistrict,
    properties.routeName,
    properties.specificLocation,
  ].some((value) => value.toLocaleLowerCase('zh-CN').includes(query))) return false
  if (ignored !== 'status' && filters.status && properties.status !== filters.status) return false
  if (ignored !== 'city' && filters.city && properties.provincialCity !== filters.city) return false
  return true
}

function countOptions<Value extends string>(
  sites: readonly SiteInventoryMapFeature[],
  valueOf: (site: SiteInventoryMapFeature) => Value,
  order?: readonly Value[],
): FilterOption<Value>[] {
  const counts = new Map<Value, number>()
  for (const site of sites) {
    const value = valueOf(site)
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const values = order
    ? order.filter((value) => counts.has(value))
    : [...counts.keys()].sort((left, right) => left.localeCompare(right, 'zh-CN'))
  return values.map((value) => ({ value, count: counts.get(value)! }))
}
