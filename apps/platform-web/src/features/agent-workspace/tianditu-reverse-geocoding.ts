const TIANDITU_REVERSE_GEOCODING_ENDPOINT = 'https://api.tianditu.gov.cn/geocoder'

type ReverseGeocodingErrorCode =
  | 'invalid_reverse_geocoding_coordinate'
  | 'reverse_geocoding_token_missing'
  | 'reverse_geocoding_provider_error'
  | 'invalid_reverse_geocoding_response'

class ReverseGeocodingError extends Error {
  constructor(readonly code: ReverseGeocodingErrorCode) {
    super(code)
    this.name = 'ReverseGeocodingError'
  }
}

export type TiandituReverseGeocodingResult = {
  locationAddress: string
  provinceCity: string
  countyDistrict: string
}

type ReverseGeocodeTiandituLocationOptions = {
  longitude: number
  latitude: number
  token: string
  signal: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string' || value.length > maximumLength) return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function parseReverseGeocodingResult(payload: unknown): TiandituReverseGeocodingResult {
  if (!isRecord(payload) || payload.status !== '0' || !isRecord(payload.result)) {
    throw new ReverseGeocodingError(
      isRecord(payload) && payload.status !== '0'
        ? 'reverse_geocoding_provider_error'
        : 'invalid_reverse_geocoding_response',
    )
  }

  const addressComponent = payload.result.addressComponent
  if (!isRecord(addressComponent)) {
    throw new ReverseGeocodingError('invalid_reverse_geocoding_response')
  }

  const locationAddress = boundedString(payload.result.formatted_address, 255)
  const countyDistrict = boundedString(addressComponent.county, 64)
  const city = addressComponent.city
  if (
    !locationAddress
    || !countyDistrict
    || typeof city !== 'string'
    || city.length > 64
  ) {
    throw new ReverseGeocodingError('invalid_reverse_geocoding_response')
  }

  const provinceCity = city.trim() || countyDistrict
  return { locationAddress, provinceCity, countyDistrict }
}

export async function reverseGeocodeTiandituLocation(
  options: ReverseGeocodeTiandituLocationOptions,
  fetcher: typeof fetch = fetch,
): Promise<TiandituReverseGeocodingResult> {
  const { longitude, latitude } = options
  if (
    !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
  ) {
    throw new ReverseGeocodingError('invalid_reverse_geocoding_coordinate')
  }

  const token = options.token.trim()
  if (!token) throw new ReverseGeocodingError('reverse_geocoding_token_missing')

  const url = new URL(TIANDITU_REVERSE_GEOCODING_ENDPOINT)
  url.searchParams.set('postStr', JSON.stringify({ lon: longitude, lat: latitude, ver: 1 }))
  url.searchParams.set('type', 'geocode')
  url.searchParams.set('tk', token)

  const response = await fetcher(url, { signal: options.signal })
  if (!response.ok) {
    throw new ReverseGeocodingError('reverse_geocoding_provider_error')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ReverseGeocodingError('invalid_reverse_geocoding_response')
  }
  return parseReverseGeocodingResult(payload)
}

export function tiandituReverseGeocodingErrorMessage(error: unknown): string | null {
  if (error instanceof DOMException && error.name === 'AbortError') return null
  if (error instanceof TypeError) return '位置解析网络连接失败，请稍后重试。'
  if (error instanceof ReverseGeocodingError) {
    switch (error.code) {
      case 'invalid_reverse_geocoding_coordinate':
        return '地图标记坐标无效，请重新选择。'
      case 'reverse_geocoding_token_missing':
        return '天地图位置解析未配置。'
      case 'invalid_reverse_geocoding_response':
      case 'reverse_geocoding_provider_error':
        return '位置解析服务异常，请稍后重新选点。'
    }
  }
  return '位置解析失败，请稍后重新选点。'
}
