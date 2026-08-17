import { describe, expect, test } from 'bun:test'

import {
  normalizeDrivingRoute,
  normalizeExpresswayCandidates,
  selectNearestExpresswayCandidates,
} from '../../src/features/site-planning/site-exploration-expressway-route'

type TestLngLat = {
  getLng: () => number
  getLat: () => number
}

function lngLat(longitude: number, latitude: number): TestLngLat {
  return { getLng: () => longitude, getLat: () => latitude }
}

function poi(
  id: string,
  name: string,
  type: string,
  longitude: number,
  latitude: number,
  distance: number,
) {
  return {
    id,
    name,
    type,
    address: '测试地址',
    distance,
    location: lngLat(longitude, latitude),
  }
}

describe('expressway route normalization', () => {
  test('deduplicates valid entrance and toll-station POIs and excludes service areas', () => {
    const result = normalizeExpresswayCandidates([
      poi('A', '许昌北收费站', '交通设施服务;收费站;高速收费站', 113.8, 34.1, 800),
      poi('A', '许昌北收费站', '交通设施服务;收费站;高速收费站', 113.8, 34.1, 800),
      poi('B', '某高速服务区', '道路附属设施;服务区', 113.81, 34.11, 900),
      poi('C', '京港澳高速入口', '交通设施服务;高速公路出入口', 113.82, 34.12, 1_200),
      poi('D', '范围外收费站', '交通设施服务;收费站;高速收费站', 113.9, 34.2, 20_001),
      poi('E', '远郊收费站', '交通设施服务;收费站;高速收费站', 113.88, 34.18, 19_500),
    ])

    expect(result.map((item) => item.id)).toEqual(['A', 'C', 'E'])
    expect(result[0]?.straightLineDistanceMeters).toBe(800)
  })

  test('uses route distance and converts every route point to WGS84', () => {
    const candidate = normalizeExpresswayCandidates([
      poi('A', '许昌北收费站', '交通设施服务;收费站;高速收费站', 113.8, 34.1, 800),
    ])[0]!

    const result = normalizeDrivingRoute(candidate, {
      distance: 6_200,
      steps: [
        { path: [lngLat(113.8, 34.1), lngLat(113.75, 34.05)] },
        { path: [lngLat(113.75, 34.05), lngLat(113.7, 34)] },
      ],
    })

    expect(result?.distanceMeters).toBe(6_200)
    expect(result?.geoJson.geometry.coordinates).toHaveLength(3)
    expect(result?.geoJson.properties).toEqual({})
    expect(result?.geoJson.geometry.coordinates[0]).not.toEqual([113.8, 34.1])
  })

  test('selects the nearest three candidates with stable distance and POI ordering', () => {
    const candidates = normalizeExpresswayCandidates([
      poi('D', '丁收费站', '高速收费站', 113.84, 34.14, 1_500),
      poi('C', '丙收费站', '高速收费站', 113.83, 34.13, 1_000),
      poi('B', '乙收费站', '高速收费站', 113.82, 34.12, 1_000),
      poi('A', '甲收费站', '高速收费站', 113.81, 34.11, 800),
    ])

    expect(selectNearestExpresswayCandidates(candidates).map((item) => item.id)).toEqual(['A', 'B', 'C'])
  })

  test('rejects a route without a positive distance or at least two valid points', () => {
    const candidate = normalizeExpresswayCandidates([
      poi('A', '许昌北收费站', '交通设施服务;收费站;高速收费站', 113.8, 34.1, 800),
    ])[0]!

    expect(normalizeDrivingRoute(candidate, { distance: 0, steps: [] })).toBeNull()
    expect(normalizeDrivingRoute(candidate, {
      distance: 100,
      steps: [{ path: [lngLat(113.8, 34.1)] }],
    })).toBeNull()
  })
})
