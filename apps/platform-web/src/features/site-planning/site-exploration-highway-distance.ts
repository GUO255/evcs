import type { SiteDistanceGeoJson, SiteExplorationImage } from './site-exploration-api'

export const HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS = 20_000
export const HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS = HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS + 1

const LEGACY_HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS = 5_001

export function isHighwayDistanceOutsideSearchRadius(
  distanceMeters: number,
  geoJson: SiteDistanceGeoJson | null,
  snapshot: SiteExplorationImage | null,
): boolean {
  return distanceMeters === HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS
    && geoJson === null
    && snapshot === null
}

export function formatHighwayDistance(
  distanceMeters: number,
  geoJson: SiteDistanceGeoJson | null,
  snapshot: SiteExplorationImage | null,
): string {
  if (isHighwayDistanceOutsideSearchRadius(distanceMeters, geoJson, snapshot)) return '> 20 公里'
  if (
    distanceMeters === LEGACY_HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS
    && geoJson === null
    && snapshot === null
  ) return ''
  return distanceMeters > 0 ? `约 ${distanceMeters.toLocaleString('zh-CN')} 米` : ''
}
