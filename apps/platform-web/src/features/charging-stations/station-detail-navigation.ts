export const defaultStationDetailTab = 'basic-information'

export const stationDetailTabIds = [
  'basic-information',
  'operating-status',
  'location',
  'equipment',
  'facilities',
  'video-monitoring',
  'staff',
  'merchants',
] as const

export type StationDetailTab = (typeof stationDetailTabIds)[number]

export interface StationDetailSearch {
  tab?: StationDetailTab
}

export function validateStationDetailSearch(search: Record<string, unknown>): StationDetailSearch {
  return typeof search.tab === 'string' && stationDetailTabIds.includes(search.tab as StationDetailTab)
    ? { tab: search.tab as StationDetailTab }
    : {}
}
