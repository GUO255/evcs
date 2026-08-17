import { describe, expect, test } from 'bun:test'

import {
  createTaskSiteFilterOptions,
  filterTaskSites,
} from '../src/features/agent-workspace/site-selection-map-task-filters'
import type { SiteInventoryMapFeature } from '../src/features/site-planning/site-inventory-api'

const sites = [
  site('1', 'G107空港服务区重卡换电站', 'completed', 'G107', '郑州市', '航空港区'),
  site('2', 'G310巩义站', 'incomplete', 'G310', '郑州市', '巩义市'),
  site('3', 'G107宜阳站', 'completed', 'G107', '洛阳市', '宜阳县'),
]

describe('task site map filters', () => {
  test('applies search and selected facets to the shared task site collection', () => {
    expect(filterTaskSites(sites, {
      query: '空港',
      status: 'completed',
      city: '郑州市',
    }).map(({ id }) => id)).toEqual(['1'])
  })

  test('calculates each facet from the other active filters', () => {
    expect(createTaskSiteFilterOptions(sites, {
      status: 'completed',
      city: '郑州市',
    })).toEqual({
      statuses: {
        total: 2,
        options: [
          { value: 'incomplete', count: 1 },
          { value: 'completed', count: 1 },
        ],
      },
      cities: {
        total: 2,
        options: [
          { value: '洛阳市', count: 1 },
          { value: '郑州市', count: 1 },
        ],
      },
    })
  })
})

function site(
  id: string,
  stationName: string,
  status: 'incomplete' | 'completed',
  routeName: string,
  provincialCity: string,
  countyDistrict: string,
): SiteInventoryMapFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [113, 34] },
    properties: {
      sequenceNumber: Number(id),
      stationName,
      provincialCity,
      countyDistrict,
      routeName,
      specificLocation: `${provincialCity}${countyDistrict}`,
      siteType: 'planned',
      status,
      statusDescription: '',
      layerCategory: status === 'completed' ? 'planned-completed' : 'planned-incomplete',
      dailyTruckTraffic2025: 0,
      trafficWeight: 0,
    },
  }
}
