import { nearbyHotspotAreaCategories } from './site-exploration-api'

type NearbyHotspotAreaCategory = (typeof nearbyHotspotAreaCategories)[number]

const hotspotIconDefinitions: Record<
  NearbyHotspotAreaCategory,
  { color: string; paths: readonly string[] }
> = {
  '物流园区': { color: '#2563eb', paths: ['M3 21V8l9-4 9 4v13', 'M5 21V10h14v11', 'M9 21v-5h6v5'] },
  '货运集散中心': { color: '#7c3aed', paths: ['M7.5 4.27 16.5 9.42', 'M3.3 7 12 12l8.7-5', 'M12 22V12', 'M3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8Z'] },
  '矿区': { color: '#a16207', paths: ['m14 4 6 6', 'm17 3 4 4', 'M3 21l9-9', 'm5 13 6 6'] },
  '大型矿山': { color: '#57534e', paths: ['M3 20 9 8l4 7 3-5 5 10Z', 'M3 20h18', 'M14 5l1-2 1 2'] },
  '港口': { color: '#0369a1', paths: ['M12 22V8', 'M5 12H2a10 10 0 0 0 20 0h-3', 'm5 10-3 2 3 2', 'm14-4 3 2-3 2', 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6'] },
  '码头': { color: '#0891b2', paths: ['M3 18c3 2 6 2 9 0s6-2 9 0', 'M5 16 4 9h16l-1 7', 'M9 9V5h6v4', 'M12 5V2'] },
  '集疏运区域': { color: '#4f46e5', paths: ['M5 19V6', 'm2 2-2-2-2 2', 'M19 5v13', 'm-2-2 2 2 2-2', 'M5 12h14'] },
  '火电厂': { color: '#dc2626', paths: ['M13 2 3 14h9l-1 8 10-12h-9l1-8Z'] },
  '化工园区': { color: '#ea580c', paths: ['M9 3h6', 'M10 3v6L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3', 'M6.5 16h11'] },
  '大型制造业基地': { color: '#475569', paths: ['M2 20h20', 'M5 20V10l5 3V9l5 3V4h4v16', 'M9 20v-3h2v3', 'M14 20v-3h2v3'] },
  '省级产业集聚区': { color: '#9333ea', paths: ['M3 21h18', 'M5 21V10h14v11', 'M3 10l9-6 9 6', 'M9 14h6', 'M9 18h6'] },
  '市级产业集聚区': { color: '#c026d3', paths: ['M3 21V7h8v14', 'M11 21V3h10v18', 'M6 11h2', 'M6 15h2', 'M14 7h4', 'M14 11h4', 'M14 15h4'] },
  '工业园区': { color: '#334155', paths: ['M3 21V5h10v16', 'M13 9h8v12', 'M7 9h2', 'M7 13h2', 'M7 17h2', 'M16 13h2', 'M16 17h2', 'M2 21h20'] },
}

export function getSiteExplorationHotspotIconDefinition(category: string) {
  const index = nearbyHotspotAreaCategories.indexOf(category as NearbyHotspotAreaCategory)
  if (index < 0) throw new Error(`Unknown nearby hotspot category: ${category}`)
  const definition = hotspotIconDefinitions[category as NearbyHotspotAreaCategory]
  return {
    ...definition,
    name: `site-selection-exploration-hotspot-${index}`,
  }
}

export function SiteExplorationHotspotIcon({
  category,
  selected = false,
}: {
  category: string
  selected?: boolean
}) {
  const definition = getSiteExplorationHotspotIconDefinition(category)
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full ${selected ? 'ring-2 ring-ring ring-offset-2' : 'ring-1 ring-background'}`}
      style={{ backgroundColor: definition.color }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {definition.paths.map((path) => <path key={path} d={path} />)}
      </svg>
    </span>
  )
}
