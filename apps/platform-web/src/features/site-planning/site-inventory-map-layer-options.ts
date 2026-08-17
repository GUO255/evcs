import type { SiteInventoryLayerCategory } from './site-inventory-api'

export const siteInventoryMapLayerOptions = [
  { id: 'planned-incomplete', label: '规划点位未完成', iconPath: '/map/s1-1.png' },
  { id: 'planned-completed', label: '规划点位已完成', iconPath: '/map/s1-4.png' },
] as const satisfies readonly {
  id: SiteInventoryLayerCategory
  label: string
  iconPath: string
}[]

const iconPathByLayerCategory = new Map(
  siteInventoryMapLayerOptions.map((option) => [option.id, option.iconPath]),
)

export function getSiteInventoryMapIconPath(
  layerCategory: SiteInventoryLayerCategory,
): string {
  const iconPath = iconPathByLayerCategory.get(layerCategory)
  if (!iconPath) throw new Error(`Unknown inventory station layer: ${layerCategory}`)
  return iconPath
}
