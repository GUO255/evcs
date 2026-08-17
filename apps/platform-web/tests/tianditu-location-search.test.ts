import { describe, expect, test } from 'bun:test'

import {
  searchTiandituLocations,
  tiandituLocationSearchErrorMessage,
} from '../src/features/agent-workspace/tianditu-location-search'

function jsonFetcher(
  body: unknown,
  inspect?: (url: URL, init: RequestInit | undefined) => void,
): typeof fetch {
  return (async (input, init) => {
    inspect?.(new URL(String(input)), init)
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

describe('Tianditu location search', () => {
  test('searches Henan and maps valid POIs to bounded location results', async () => {
    let requestPayload: Record<string, unknown> | undefined
    let requestSignal: AbortSignal | null | undefined
    const controller = new AbortController()
    const results = await searchTiandituLocations(
      { keyword: ' 郑州东站 ', token: 'test-token', signal: controller.signal },
      jsonFetcher({
        status: { infocode: 1000, cndesc: 'OK' },
        resultType: 1,
        pois: [{
          hotPointID: 'poi-1',
          name: '郑州东站',
          address: '郑州市金水区',
          lonlat: '113.779,34.759',
        }],
      }, (url, init) => {
        expect(url.origin + url.pathname).toBe('https://api.tianditu.gov.cn/v2/search')
        expect(url.searchParams.get('type')).toBe('query')
        expect(url.searchParams.get('tk')).toBe('test-token')
        requestPayload = JSON.parse(url.searchParams.get('postStr') ?? '') as Record<string, unknown>
        requestSignal = init?.signal
      }),
    )

    expect(requestPayload).toEqual({
      keyWord: '郑州东站',
      queryType: 12,
      start: 0,
      count: 10,
      specify: '河南省',
      show: 1,
    })
    expect(requestSignal).toBe(controller.signal)
    expect(results).toEqual([{
      id: 'poi-1',
      name: '郑州东站',
      address: '郑州市金水区',
      longitude: 113.779,
      latitude: 34.759,
    }])
  })

  test('returns an empty result for Tianditu no-data status', async () => {
    const results = await searchTiandituLocations(
      { keyword: '不存在的地点', token: 'test-token', signal: new AbortController().signal },
      jsonFetcher({ status: { infocode: 3001, cndesc: 'No data found' } }),
    )

    expect(results).toEqual([])
  })

  test('rejects a successful response containing an invalid coordinate', async () => {
    const request = searchTiandituLocations(
      { keyword: '错误地点', token: 'test-token', signal: new AbortController().signal },
      jsonFetcher({
        status: { infocode: 1000, cndesc: 'OK' },
        resultType: 1,
        pois: [{
          hotPointID: 'poi-1',
          name: '错误地点',
          address: '',
          lonlat: '181,34',
        }],
      }),
    )

    await expect(request).rejects.toThrow('invalid_location_search_response')
  })

  test('normalizes provider and network failures without exposing response details', async () => {
    const providerRequest = searchTiandituLocations(
      { keyword: '郑州', token: 'test-token', signal: new AbortController().signal },
      jsonFetcher({ status: { infocode: 2001, cndesc: 'private provider detail' } }),
    )
    await expect(providerRequest).rejects.toThrow('location_search_provider_error')

    expect(tiandituLocationSearchErrorMessage(new TypeError('private network detail')))
      .toBe('位置搜索网络连接失败，请稍后重试。')
  })
})
