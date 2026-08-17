import { describe, expect, test } from 'bun:test'

import * as siteExplorationApi from '../../src/features/site-planning/site-exploration-api'
import * as siteExplorationData from '../../src/features/site-planning/site-exploration-data'
import * as siteExplorationDaily from '../../src/features/site-planning/site-exploration-daily'
import { createEmptySiteExplorationInput } from '../../src/features/site-planning/site-exploration-fields'

function parseSiteExplorationFilterOptions(value: unknown): siteExplorationData.SiteExplorationFilterOptions {
  const parser = Reflect.get(siteExplorationData, 'parseSiteExplorationFilterOptions')
  expect(typeof parser).toBe('function')
  return (parser as (input: unknown) => siteExplorationData.SiteExplorationFilterOptions)(value)
}

describe('site exploration list response', () => {
  test('accepts persisted power, competitor, and preliminary design details', async () => {
    const record = {
      ...createEmptySiteExplorationInput(),
      id: '42', contractDate: '',
      construction: {
        constructionStatus: '', constructionEntity: '', stationType: '', driverHomeProvision: '',
        chargingEquipmentCapacityKva: 0, batterySwapEquipmentCapacityKva: 0,
        photovoltaicCapacityKw: 0, energyStorageCapacityKwh: 0,
      },
      status: 'completed', explorerName: '周建伟', explorationTeamId: '8', explorationTeam: '一组',
      explorationDate: '2026-08-11', overallScore: 0, selectionRecommendation: '', hasAnalysis: false,
      latestAnalysisTaskId: null,
      satelliteImages: [], accessConvenienceImages: [], landSceneImages: [], otherStructureImages: [],
      landOwnershipDocuments: [], leaseAgreementDocuments: [], surveyDeterminationReports: [],
      sourceSatelliteAttachments: [], sourceAccessConvenienceAttachments: [],
      sourceLandSceneAttachments: [], sourceOtherStructureAttachments: [],
      createdByMemberId: '7', createdByMemberName: '周建伟',
      updatedByMemberId: '7', updatedByMemberName: '周建伟', createdAt: 1, updatedAt: 2,
      powerAccessMethod: '10kv', electricityNature: 'industrial',
      highVoltageAccessMethod: 'new-box-transformer', tenKvLineAccessDistanceMeters: 120,
      competitors: [
        { stationName: '郑州南重卡充电站', scale: '两个堆', modelQuantity: '480-720kW*12', utilizationRate: '较高', electricityPrice: '谷段 0.88 元/kWh' },
        { stationName: '航空港充电站', scale: '2000kW', modelQuantity: '400kW*5', utilizationRate: '高', electricityPrice: '谷段 0.61 元/kWh' },
      ],
      surveyRecommendation: 'priority-construction', chargingPileModel: '400kW 以上充电堆',
      chargingPileQuantity: 30, transformerCapacity: '12000kVA', transformerQuantity: 6,
      preliminaryDesignNotes: '车流量较大',
    }
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => Response.json(record)
    try {
      await expect(siteExplorationApi.getSiteExplorationSite('42')).resolves.toMatchObject({
        powerAccessMethod: '10kv',
        tenKvLineAccessDistanceMeters: 120,
        surveyRecommendation: 'priority-construction',
        chargingPileQuantity: 30,
        transformerQuantity: 6,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('downloads an Excel export with every active list filter', async () => {
    let requestedUrl = ''
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input) => {
      requestedUrl = String(input)
      return new Response(new Uint8Array([80, 75, 3, 4]), {
        headers: {
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': "attachment; filename*=UTF-8''%E5%8B%98%E6%8E%A2%E7%AB%99%E7%82%B9-20260810.xlsx",
        },
      })
    }
    try {
      const exported = await siteExplorationApi.exportSiteExplorationSites({
        status: 'completed',
        team: '一组',
        explorer: '周建伟',
        city: '平顶山市',
        route: 'G107',
        projectPrefix: 'G107',
      })

      expect(requestedUrl).toBe('/gateway/site-selection/api/intelligent-site-selection/exploration-sites/export?status=completed&team=%E4%B8%80%E7%BB%84&explorer=%E5%91%A8%E5%BB%BA%E4%BC%9F&city=%E5%B9%B3%E9%A1%B6%E5%B1%B1%E5%B8%82&route=G107&projectPrefix=G107')
      expect(exported.fileName).toBe('勘探站点-20260810.xlsx')
      expect([...new Uint8Array(await exported.blob.arrayBuffer())]).toEqual([80, 75, 3, 4])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('accepts the signed first satellite image preview', async () => {
    const satelliteImagePreview = {
      objectKey: 'site-exploration/42/satelliteImages/satellite.webp',
      url: 'https://example.test/signed-satellite.webp',
      originalName: '卫星图.webp',
      contentType: 'image/webp',
      size: 1536,
    }
    const item = {
      id: '42', status: 'draft', explorerName: '周建伟', explorationTeamId: '8', explorationTeam: '一组',
      explorationDate: '2026-08-03', overallScore: 0, selectionRecommendation: '', hasAnalysis: false,
      projectName: '郑州航空港物流园充电站', provinceCity: '郑州市', countyDistrict: '航空港区',
      locationSnapshot: null, siteBoundarySnapshot: null, satelliteImagePreview,
      highwayDistanceMeters: 3200, siteAreaSquareMeters: 4500.5, trafficVisitCount: 1280,
      arterialRoadDistanceMeters: 600, nearestRoadName: 'G107 · 京港线', uniqueTrafficVehicleCount: 760,
      nearbyChargingStationCount: 3, nearbyHotspotAreaCount: 8,
      completionCompleted: 12, completionTotal: 17, contractCompletionCompleted: 0, contractCompletionTotal: 1,
      createdAt: 1785686300, updatedAt: 1785686400,
    }
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => Response.json({ items: [item], nextCursor: null })
    try {
      await expect(siteExplorationApi.listSiteExplorationSites({ limit: 20 }))
        .resolves.toEqual({ items: [item], nextCursor: null })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('site exploration filter option response', () => {
  test('accepts bounded cascading facets with counts', () => {
    const response = {
      canFilterByTeam: true,
      scopeTeamName: null,
      statuses: { total: 2, options: [{ value: 'draft', count: 2 }] },
      teams: { total: 2, options: [{ value: '一组', count: 2 }] },
      explorers: { total: 2, options: [{ value: '张三', count: 2 }] },
      cities: { total: 2, options: [{ value: '安阳市', count: 1 }, { value: '平顶山市', count: 1 }] },
      routes: { total: 2, options: [{ value: 'G107', count: 2 }] },
    }
    expect(parseSiteExplorationFilterOptions(response)).toEqual(response)
  })

  test('rejects duplicate, blank, oversized, negative, and extra facet fields', () => {
    const validStatuses = { total: 1, options: [{ value: 'draft', count: 1 }] }
    const validTeams = { total: 1, options: [{ value: '一组', count: 1 }] }
    const validExplorers = { total: 1, options: [{ value: '张三', count: 1 }] }
    const validRoutes = { total: 1, options: [{ value: 'G107', count: 1 }] }
    const invalidResponses = [
      { canFilterByTeam: 'yes', scopeTeamName: null, statuses: validStatuses, teams: validTeams, explorers: validExplorers, cities: { total: 1, options: [{ value: '安阳市', count: 1 }] }, routes: validRoutes },
      {
        canFilterByTeam: false,
        scopeTeamName: '四组',
        statuses: validStatuses,
        teams: validTeams,
        explorers: validExplorers,
        cities: { total: 2, options: [{ value: '安阳市', count: 1 }, { value: '安阳市', count: 1 }] },
        routes: validRoutes,
      },
      { canFilterByTeam: false, scopeTeamName: '四组', statuses: validStatuses, teams: validTeams, explorers: validExplorers, cities: { total: 1, options: [{ value: ' ', count: 1 }] }, routes: validRoutes },
      { canFilterByTeam: false, scopeTeamName: '四组', statuses: validStatuses, teams: validTeams, explorers: validExplorers, cities: { total: 1, options: [{ value: '市'.repeat(65), count: 1 }] }, routes: validRoutes },
      { canFilterByTeam: false, scopeTeamName: '四组', statuses: validStatuses, teams: validTeams, explorers: validExplorers, cities: { total: 1, options: [{ value: '安阳市', count: -1 }] }, routes: validRoutes },
      {
        canFilterByTeam: false,
        scopeTeamName: '四组',
        statuses: validStatuses,
        teams: validTeams,
        explorers: validExplorers,
        cities: { total: 1, options: [{ value: '安阳市', count: 1 }] },
        routes: validRoutes,
        extra: true,
      },
    ]

    for (const invalidResponse of invalidResponses) {
      expect(() => parseSiteExplorationFilterOptions(invalidResponse)).toThrow(
        'malformed_site_exploration_response',
      )
    }
  })
})

describe('site exploration map response', () => {
  test('preserves whether a mapped site has an AI analysis report', () => {
    const parser = Reflect.get(siteExplorationApi, 'parseSiteExplorationMapData')
    expect(typeof parser).toBe('function')
    if (typeof parser !== 'function') return

    const response = {
      scopeTeamName: null,
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          id: '42',
          geometry: { type: 'Point', coordinates: [112.893589, 33.947071] },
          properties: {
            status: 'completed',
            explorerName: '周建伟',
            explorationDate: '2026-08-01',
            overallScore: 91,
            hasAnalysis: true,
            selectionRecommendation: 'priority',
            projectName: 'G107平顶山市石龙区',
            provinceCity: '平顶山市',
            countyDistrict: '石龙区',
            locationAddress: '河南省平顶山市石龙区',
            highwayDistanceMeters: 3200,
            siteAreaSquareMeters: 4500.5,
            trafficVisitCount: 1280,
            arterialRoadDistanceMeters: 600,
            nearestRoadName: 'G107 · 京港线',
            uniqueTrafficVehicleCount: 760,
            nearbyChargingStationCount: 3,
            nearbyHotspotAreaCount: 8,
          },
        }],
      },
      summary: {
        total: 1,
        located: 1,
        unlocated: 0,
        byStatus: {
          draft: 0,
          completed: 1,
          signed: 0,
          'under-construction': 0,
          operating: 0,
        },
      },
    }

    expect(parser(response)).toEqual(response)
  })

  test('preserves the scoped exploration team name for map titles', () => {
    const parser = Reflect.get(siteExplorationApi, 'parseSiteExplorationMapData')
    expect(typeof parser).toBe('function')
    if (typeof parser !== 'function') return

    const response = {
      scopeTeamName: '四组',
      data: { type: 'FeatureCollection', features: [] },
      summary: {
        total: 0,
        located: 0,
        unlocated: 0,
        byStatus: {
          draft: 0,
          completed: 0,
          signed: 0,
          'under-construction': 0,
          operating: 0,
        },
      },
    }

    expect(parser(response)).toEqual(response)
  })
})

describe('site exploration API errors', () => {
  test('maps missing exploration team access to an administrator setup instruction', async () => {
    const parser = Reflect.get(siteExplorationApi, 'parseSiteExplorationApiError')
    expect(typeof parser).toBe('function')
    if (typeof parser !== 'function') return

    const error = await parser(new Response(
      JSON.stringify({ error: 'exploration_site_access_denied' }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    ))

    expect(error).toMatchObject({
      status: 403,
      code: 'exploration_site_access_denied',
      message: '当前账号尚未加入可用的勘探小组，请联系管理员设置小组。',
    })
  })
})

describe('daily site exploration response', () => {
  test('accepts a daily site page with the signed boundary survey image', () => {
    const parser = Reflect.get(siteExplorationDaily, 'parseSiteExplorationDailyPage')
    expect(typeof parser).toBe('function')
    if (typeof parser !== 'function') return

    const response = {
      items: [{
        id: '42',
        projectName: '郑州航空港物流园充电站',
        provinceCity: '郑州市',
        countyDistrict: '航空港区',
        siteBoundarySnapshot: {
          objectKey: 'site-exploration/42/boundary.webp',
          url: 'https://example.test/signed-boundary.webp',
          originalName: '场站边界测绘图.webp',
          contentType: 'image/webp',
          size: 2048,
        },
        locationSnapshot: null,
        explorationDate: '2026-08-03',
        overallScore: 91,
        selectionRecommendation: 'priority',
        updatedAt: 1785686400000,
      }],
      nextCursor: null,
    }

    expect(parser(response)).toEqual(response)
  })

  test('accepts a missing boundary image and rejects extra fields', () => {
    const parser = Reflect.get(siteExplorationDaily, 'parseSiteExplorationDailyPage')
    expect(typeof parser).toBe('function')
    if (typeof parser !== 'function') return

    const item = {
      id: '43',
      projectName: '待分析站点',
      provinceCity: '郑州市',
      countyDistrict: '中牟县',
      siteBoundarySnapshot: null,
      locationSnapshot: {
        objectKey: 'site-exploration/43/location.webp',
        url: 'https://example.test/signed-location.webp',
        originalName: '站点定位图.webp',
        contentType: 'image/webp',
        size: 1024,
      },
      explorationDate: '2026-08-03',
      overallScore: 0,
      selectionRecommendation: '',
      updatedAt: 1785686400000,
    }
    expect(parser({ items: [item], nextCursor: 'cursor-2' })).toEqual({
      items: [item],
      nextCursor: 'cursor-2',
    })
    expect(() => parser({ items: [{ ...item, reportUrl: 'wrong-field' }], nextCursor: null }))
      .toThrow('malformed_site_exploration_response')
  })
})
