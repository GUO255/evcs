export function formatSiteExplorationDistance(distanceMeters: number): string {
  if (distanceMeters <= 0) return '—'
  return distanceMeters < 1_000
    ? `${distanceMeters.toLocaleString('zh-CN')} 米`
    : `${(distanceMeters / 1_000).toFixed(2)} 公里`
}

export function formatSiteExplorationArea(squareMeters: number): string {
  return squareMeters > 0
    ? `${Math.round(squareMeters).toLocaleString('zh-CN')} ㎡`
    : '—'
}

export function formatSiteExplorationTraffic(visitCount: number | null): string {
  return visitCount === null
    ? '—'
    : `${visitCount.toLocaleString('zh-CN')} 辆次`
}

export function formatSiteExplorationUniqueTraffic(uniqueVehicleCount: number | null): string {
  return uniqueVehicleCount === null
    ? '—'
    : `${uniqueVehicleCount.toLocaleString('zh-CN')} 辆`
}
