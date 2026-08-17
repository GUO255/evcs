import { describe, expect, test } from 'bun:test'

import {
  reverseGeocodeTiandituLocation,
  tiandituReverseGeocodingErrorMessage,
} from '../src/features/agent-workspace/tianditu-reverse-geocoding'

function jsonFetcher(
  body: unknown,
  inspect?: (url: URL, init: RequestInit | undefined) => void,
  status = 200,
): typeof fetch {
  return (async (input, init) => {
    inspect?.(new URL(String(input)), init)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

describe('Tianditu reverse geocoding', () => {
  test('maps a coordinate to bounded address fields', async () => {
    const controller = new AbortController()
    let requestPayload: Record<string, unknown> | undefined
    let requestSignal: AbortSignal | null | undefined

    const result = await reverseGeocodeTiandituLocation(
      {
        longitude: 113.6254,
        latitude: 34.7466,
        token: 'test-token',
        signal: controller.signal,
      },
      jsonFetcher({
        status: '0',
        result: {
          formatted_address: '河南省郑州市金水区人民路1号',
          addressComponent: {
            province: '河南省',
            city: '郑州市',
            county: '金水区',
          },
        },
      }, (url, init) => {
        expect(url.origin + url.pathname).toBe('https://api.tianditu.gov.cn/geocoder')
        expect(url.searchParams.get('type')).toBe('geocode')
        expect(url.searchParams.get('tk')).toBe('test-token')
        requestPayload = JSON.parse(url.searchParams.get('postStr') ?? '') as Record<string, unknown>
        requestSignal = init?.signal
      }),
    )

    expect(requestPayload).toEqual({ lon: 113.6254, lat: 34.7466, ver: 1 })
    expect(requestSignal).toBe(controller.signal)
    expect(result).toEqual({
      locationAddress: '河南省郑州市金水区人民路1号',
      provinceCity: '郑州市',
      countyDistrict: '金水区',
    })
  })

  test('uses the county-level city when the provider omits city', async () => {
    const result = await reverseGeocodeTiandituLocation(
      {
        longitude: 112.5901,
        latitude: 35.0904,
        token: 'test-token',
        signal: new AbortController().signal,
      },
      jsonFetcher({
        status: '0',
        result: {
          formatted_address: '河南省济源市济水街道',
          addressComponent: {
            province: '河南省',
            city: '',
            county: '济源市',
          },
        },
      }),
    )

    expect(result).toEqual({
      locationAddress: '河南省济源市济水街道',
      provinceCity: '济源市',
      countyDistrict: '济源市',
    })
  })

  test('rejects incomplete provider results', async () => {
    const request = reverseGeocodeTiandituLocation(
      {
        longitude: 113.6254,
        latitude: 34.7466,
        token: 'test-token',
        signal: new AbortController().signal,
      },
      jsonFetcher({
        status: '0',
        result: {
          formatted_address: '河南省郑州市',
          addressComponent: { city: '郑州市', county: '' },
        },
      }),
    )

    await expect(request).rejects.toThrow('invalid_reverse_geocoding_response')
  })

  test('rejects invalid coordinates before sending a request', async () => {
    let requested = false
    const request = reverseGeocodeTiandituLocation(
      {
        longitude: 181,
        latitude: 34.7466,
        token: 'test-token',
        signal: new AbortController().signal,
      },
      jsonFetcher({}, () => { requested = true }),
    )

    await expect(request).rejects.toThrow('invalid_reverse_geocoding_coordinate')
    expect(requested).toBe(false)
  })

  test('normalizes provider, network, and abort failures', async () => {
    const providerRequest = reverseGeocodeTiandituLocation(
      {
        longitude: 113.6254,
        latitude: 34.7466,
        token: 'test-token',
        signal: new AbortController().signal,
      },
      jsonFetcher({ status: '1', msg: 'private provider detail' }),
    )
    await expect(providerRequest).rejects.toThrow('reverse_geocoding_provider_error')

    const httpRequest = reverseGeocodeTiandituLocation(
      {
        longitude: 113.6254,
        latitude: 34.7466,
        token: 'test-token',
        signal: new AbortController().signal,
      },
      jsonFetcher({}, undefined, 503),
    )
    await expect(httpRequest).rejects.toThrow('reverse_geocoding_provider_error')

    expect(tiandituReverseGeocodingErrorMessage(new TypeError('private network detail')))
      .toBe('位置解析网络连接失败，请稍后重试。')
    expect(tiandituReverseGeocodingErrorMessage(new DOMException('aborted', 'AbortError')))
      .toBeNull()
  })
})
