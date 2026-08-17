export function calculatePolygonAreaSquareMeters(coordinates: number[][][]): number {
  const [outerRing, ...innerRings] = coordinates
  if (!outerRing) return 0

  const outerArea = Math.abs(calculateSphericalRingArea(outerRing))
  const innerArea = innerRings.reduce(
    (total, ring) => total + Math.abs(calculateSphericalRingArea(ring)),
    0,
  )
  return Math.round(Math.max(0, outerArea - innerArea) * 100) / 100
}

export function calculatePolygonPerimeterMeters(coordinates: number[][][]): number {
  const perimeter = coordinates.reduce((total, ring) => {
    if (ring.length < 2) return total

    let ringPerimeter = 0
    for (let index = 1; index < ring.length; index += 1) {
      const start = ring[index - 1]
      const end = ring[index]
      if (!start || !end || start.length < 2 || end.length < 2) continue
      ringPerimeter += calculateGreatCircleDistance(
        [start[0] as number, start[1] as number],
        [end[0] as number, end[1] as number],
      )
    }

    const first = ring[0]
    const last = ring[ring.length - 1]
    if (
      first
      && last
      && first.length >= 2
      && last.length >= 2
      && (first[0] !== last[0] || first[1] !== last[1])
    ) {
      ringPerimeter += calculateGreatCircleDistance(
        [last[0] as number, last[1] as number],
        [first[0] as number, first[1] as number],
      )
    }
    return total + ringPerimeter
  }, 0)

  return Math.round(perimeter * 100) / 100
}

export function calculateGreatCircleDistance(
  [startLongitude, startLatitude]: [number, number],
  [endLongitude, endLatitude]: [number, number],
): number {
  const earthRadiusInMeters = 6_371_008.8
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = toRadians(endLatitude - startLatitude)
  const longitudeDelta = toRadians(endLongitude - startLongitude)
  const startLatitudeRadians = toRadians(startLatitude)
  const endLatitudeRadians = toRadians(endLatitude)
  const haversine = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitudeRadians)
    * Math.cos(endLatitudeRadians)
    * Math.sin(longitudeDelta / 2) ** 2
  )

  return 2 * earthRadiusInMeters * Math.asin(Math.sqrt(haversine))
}

export function findPathMidpoint(
  coordinates: readonly GeoJSON.Position[],
): [number, number] | null {
  if (coordinates.length < 2) return null

  const segmentDistances = coordinates.slice(1).map((end, index) => {
    const start = coordinates[index]
    if (!start || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) {
      return 0
    }
    return calculateGreatCircleDistance(
      [start[0], start[1]],
      [end[0], end[1]],
    )
  })
  const totalDistance = segmentDistances.reduce((total, distance) => total + distance, 0)
  const first = coordinates[0]
  if (!first || first[0] === undefined || first[1] === undefined) return null
  if (totalDistance <= 0) return [first[0], first[1]]

  const targetDistance = totalDistance / 2
  let traversedDistance = 0
  for (const [index, segmentDistance] of segmentDistances.entries()) {
    if (traversedDistance + segmentDistance < targetDistance) {
      traversedDistance += segmentDistance
      continue
    }
    const start = coordinates[index]
    const end = coordinates[index + 1]
    if (!start || !end || start[0] === undefined || start[1] === undefined || end[0] === undefined || end[1] === undefined) {
      return null
    }
    const ratio = segmentDistance === 0 ? 0 : (targetDistance - traversedDistance) / segmentDistance
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ]
  }

  const last = coordinates.at(-1)
  return last && last[0] !== undefined && last[1] !== undefined
    ? [last[0], last[1]]
    : null
}

function calculateSphericalRingArea(ring: number[][]): number {
  if (ring.length < 4) return 0

  const earthRadiusInMeters = 6_371_008.8
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  let area = 0
  for (let index = 0; index < ring.length; index += 1) {
    const lower = ring[(index + ring.length - 1) % ring.length]
    const middle = ring[index]
    const upper = ring[(index + 1) % ring.length]
    if (!lower || !middle || !upper) continue
    const lowerLongitude = lower[0]
    const middleLatitude = middle[1]
    const upperLongitude = upper[0]
    if (
      lowerLongitude === undefined
      || middleLatitude === undefined
      || upperLongitude === undefined
    ) continue
    area += (
      toRadians(upperLongitude) - toRadians(lowerLongitude)
    ) * Math.sin(toRadians(middleLatitude))
  }
  return area * earthRadiusInMeters ** 2 / 2
}
