export type SiteInventoryType = 'planned'
export type SiteInventoryStatus = 'incomplete' | 'completed'

export interface SiteInventoryStation {
  id: string
  code: string
  name: string
  city: string
  district: string
  longitude: number
  latitude: number
  siteType: SiteInventoryType
  status: SiteInventoryStatus
  operatorName: string
  chargerCount: number
  connectorCount: number
  statusUpdatedAt: string
}

export const siteInventoryTypeOptions = [
  { value: 'planned', label: '规划点位' },
] as const satisfies readonly {
  value: SiteInventoryType
  label: string
}[]

export const siteInventoryStatusOptions = [
  { value: 'incomplete', label: '未完成' },
  { value: 'completed', label: '已完成' },
] as const satisfies readonly {
  value: SiteInventoryStatus
  label: string
}[]

export const siteInventoryStations: readonly SiteInventoryStation[] = []

export function getSiteInventoryTypeLabel(siteType: SiteInventoryType): string {
  return siteInventoryTypeOptions.find((option) => option.value === siteType)?.label
    ?? siteType
}

export function getSiteInventoryStatusLabel(status: SiteInventoryStatus): string {
  return siteInventoryStatusOptions.find((option) => option.value === status)?.label
    ?? status
}
