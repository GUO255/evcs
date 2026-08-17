import { gcj02ToWgs84 } from '@evcs/geo-coordinates'

import type { AmapDrivingRoute, AmapLngLat, AmapPoi } from './amap-js-api'
import type { SiteDistanceGeoJson } from './site-exploration-api'
import { HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS } from './site-exploration-highway-distance'


export type ExpresswayEntranceCandidate = {
  id: string
  name: string
  address: string
  type: string
  straightLineDistanceMeters: number
  gcj02: [number, number]
  wgs84: [number, number]
}

export type ExpresswayDrivingRoute = {
  candidate: ExpresswayEntranceCandidate
  distanceMeters: number
  geoJson: SiteDistanceGeoJson
}

export function normalizeExpresswayCandidates(
  pois: readonly AmapPoi[],
): ExpresswayEntranceCandidate[] {
  const candidates = pois.flatMap((poi) => {
    const candidate = toExpresswayCandidate(poi)
    return candidate ? [candidate] : []
  })
  return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()]
    .sort((left, right) => (
      left.straightLineDistanceMeters - right.straightLineDistanceMeters
      || left.id.localeCompare(right.id)
    ))
}

export function selectNearestExpresswayCandidates(
  candidates: readonly ExpresswayEntranceCandidate[],
): ExpresswayEntranceCandidate[] {
  return [...candidates]
    .sort((left, right) => (
      left.straightLineDistanceMeters - right.straightLineDistanceMeters
      || left.id.localeCompare(right.id)
    ))
    .slice(0, 3)
}

export function normalizeDrivingRoute(
  candidate: ExpresswayEntranceCandidate,
  route: AmapDrivingRoute,
): ExpresswayDrivingRoute | null {
  const distanceMeters = typeof route.distance === 'number'
    ? route.distance
    : typeof route.distance === 'string'
      ? Number.parseFloat(route.distance)
      : Number.NaN
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null

  const coordinates = (route.steps ?? []).flatMap((step) => step.path ?? [])
    .flatMap((position) => {
      const gcj02 = readLngLat(position)
      if (!gcj02) return []
      const wgs84 = gcj02ToWgs84(gcj02[0], gcj02[1])
      return [[wgs84.longitude, wgs84.latitude] as [number, number]]
    })
    .filter((position, index, all) => (
      index === 0
      || position[0] !== all[index - 1]?.[0]
      || position[1] !== all[index - 1]?.[1]
    ))
  if (coordinates.length < 2) return null

  return {
    candidate,
    distanceMeters: Math.round(distanceMeters),
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    },
  }
}

function toExpresswayCandidate(poi: AmapPoi): ExpresswayEntranceCandidate | null {
  const name = poi.name?.trim() ?? ''
  const type = poi.type?.trim() ?? ''
  const searchableText = `${name};${type}`
  if (!name || /服务区/u.test(searchableText) || !isExpresswayEntrance(searchableText)) return null

  const gcj02 = readLngLat(poi.location)
  if (!gcj02) return null
  const rawDistance = typeof poi.distance === 'number'
    ? poi.distance
    : typeof poi.distance === 'string'
      ? Number.parseFloat(poi.distance)
      : Number.NaN
  if (!Number.isFinite(rawDistance) || rawDistance < 0 || rawDistance > HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS) return null

  const wgs84Coordinate = gcj02ToWgs84(gcj02[0], gcj02[1])
  return {
    id: poi.id?.trim() || `${name}-${gcj02[0]}-${gcj02[1]}`,
    name,
    address: [
      poi.pname,
      normalizeAddressPart(poi.cityname),
      poi.adname,
      normalizeAddressPart(poi.address),
    ].filter(Boolean).join('') || name,
    type,
    straightLineDistanceMeters: Math.round(rawDistance),
    gcj02,
    wgs84: [wgs84Coordinate.longitude, wgs84Coordinate.latitude],
  }
}

function isExpresswayEntrance(value: string): boolean {
  return /收费站|高速收费|高速公路出入口|高速(?:公路)?(?:入口|出口|路口)|(?:入口|出口|路口).*高速/u.test(value)
}

function readLngLat(value: AmapLngLat | undefined): [number, number] | null {
  const longitude = value?.getLng?.() ?? value?.lng
  const latitude = value?.getLat?.() ?? value?.lat
  return typeof longitude === 'number'
    && Number.isFinite(longitude)
    && typeof latitude === 'number'
    && Number.isFinite(latitude)
    && longitude >= -180
    && longitude <= 180
    && latitude >= -90
    && latitude <= 90
    ? [longitude, latitude]
    : null
}

function normalizeAddressPart(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.filter(Boolean).join('') : value ?? ''
}
