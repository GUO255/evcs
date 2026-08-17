import { calculateGreatCircleDistance } from './site-exploration-geometry'

type Coordinate = {
  longitude: number
  latitude: number
}

type NearbyPlace = Coordinate & {
  distanceMeters: number | null
}

export function formatNearbyPlaceDistance(center: Coordinate, place: NearbyPlace): string {
  const distanceMeters = place.distanceMeters ?? calculateCoordinateDistance(center, place)
  if (distanceMeters === null) return ''
  return distanceMeters < 1_000
    ? `距站点 ${Math.round(distanceMeters)} 米`
    : `距站点 ${(distanceMeters / 1_000).toFixed(1)} 公里`
}

function calculateCoordinateDistance(start: Coordinate, end: Coordinate): number | null {
  if (!isValidCoordinate(start) || !isValidCoordinate(end)) return null
  return calculateGreatCircleDistance(
    [start.longitude, start.latitude],
    [end.longitude, end.latitude],
  )
}

function isValidCoordinate(coordinate: Coordinate): boolean {
  return Number.isFinite(coordinate.longitude)
    && Number.isFinite(coordinate.latitude)
    && coordinate.longitude >= -180
    && coordinate.longitude <= 180
    && coordinate.latitude >= -90
    && coordinate.latitude <= 90
    && !(coordinate.longitude === 0 && coordinate.latitude === 0)
}
