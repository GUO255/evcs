import { Badge } from '@/components/ui/badge'

import type { SiteExplorationInput } from './site-exploration-api'
import { isHighwayDistanceOutsideSearchRadius } from './site-exploration-highway-distance'

export function createSiteExplorationCompletion(
  value: SiteExplorationInput,
  landSceneImageCount: number,
) {
  return {
    location: Boolean(value.locationAddress.trim() && value.locationSnapshot),
    projectName: Boolean(value.projectName.trim()),
    boundary: Boolean(value.siteBoundaryGeoJson && value.siteBoundarySnapshot && value.siteAreaSquareMeters > 0),
    highwayDistance: isHighwayDistanceOutsideSearchRadius(
      value.highwayDistanceMeters,
      value.highwayDistanceGeoJson,
      value.highwayDistanceSnapshot,
    ) || Boolean(value.highwayDistanceGeoJson && value.highwayDistanceSnapshot && value.highwayDistanceMeters > 0),
    arterialRoadDistance: Boolean(value.arterialRoadDistanceGeoJson && value.arterialRoadDistanceSnapshot && value.arterialRoadDistanceMeters > 0),
    accessConvenience: Boolean(value.accessConvenience),
    landQualification: !value.landQualified || Boolean(value.landType && (value.landType !== 'other' || value.landTypeDescription.trim())),
    landScene: landSceneImageCount > 0,
    otherStructures: true,
    groundHardening: Boolean(value.groundHardening),
    terrainCondition: Boolean(value.terrainCondition),
    capacity: Boolean(value.capacityDescription.trim()),
    nearbyStations: Boolean(value.nearbyTruckChargingStationSnapshot),
    nearbyTaskStations: Boolean(value.nearbyTaskStationSnapshot),
    nearbyHotspots: Boolean(value.nearbyHotspotAreaSnapshot),
    cooperation: Boolean(value.cooperationMode && value.cooperationTerms.trim()),
    siteMaturity: Boolean(value.siteMaturity),
  } as const
}

export function SiteExplorationCompletionBadge({
  items,
  neutralWhenEmpty = false,
  neutralWhenIncomplete = false,
  optional = false,
}: {
  items: readonly boolean[]
  neutralWhenEmpty?: boolean
  neutralWhenIncomplete?: boolean
  optional?: boolean
}) {
  return (
    <SiteExplorationCompletionCountBadge
      completed={items.filter(Boolean).length}
      total={items.length}
      neutralWhenEmpty={neutralWhenEmpty}
      neutralWhenIncomplete={neutralWhenIncomplete}
      optional={optional}
    />
  )
}

export function SiteExplorationCompletionCountBadge({
  completed,
  total,
  neutralWhenEmpty = false,
  neutralWhenIncomplete = false,
  optional = false,
}: {
  completed: number
  total: number
  neutralWhenEmpty?: boolean
  neutralWhenIncomplete?: boolean
  optional?: boolean
}) {
  const complete = total > 0 && completed === total
  const notStarted = neutralWhenEmpty && completed === 0
  return (
    <Badge
      variant={complete ? 'default' : optional || neutralWhenIncomplete || notStarted ? 'secondary' : 'destructive'}
      className={complete
        ? 'shrink-0 tabular-nums'
        : optional || neutralWhenIncomplete || notStarted
          ? 'shrink-0 tabular-nums text-muted-foreground'
        : 'shrink-0 bg-destructive text-destructive-foreground tabular-nums'}
      aria-label={`${optional ? '已填写' : '已完成'} ${completed} 项，共 ${total} 项`}
    >
      {completed}/{total}
    </Badge>
  )
}
