const TIANDITU_SEARCH_ENDPOINT = 'https://api.tianditu.gov.cn/v2/search'
const HENAN_PROVINCE = '河南省'
const SEARCH_RESULT_LIMIT = 10

type LocationSearchErrorCode =
  | 'invalid_location_search_keyword'
  | 'location_search_token_missing'
  | 'location_search_provider_error'
  | 'invalid_location_search_response'

class LocationSearchError extends Error {
  constructor(readonly code: LocationSearchErrorCode) {
    super(code)
    this.name = 'LocationSearchError'
  }
}

export type TiandituLocationSearchResult = {
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
}

type SearchTiandituLocationsOptions = {
  keyword: string
  token: string
  signal: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseBoundedString(
  value: unknown,
  maximumLength: number,
  allowEmpty = false,
): string | null {
  if (typeof value !== 'string' || value.length > maximumLength) {
    return null
  }

  const normalized = value.trim()
  if (!allowEmpty && normalized.length === 0) {
    return null
  }

  return normalized
}

function parseCoordinate(value: unknown): { longitude: number; latitude: number } | null {
  if (typeof value !== 'string') {
    return null
  }

  const parts = value.split(',')
  if (parts.length !== 2) {
    return null
  }

  const longitude = Number(parts[0])
  const latitude = Number(parts[1])
  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) {
    return null
  }

  return { longitude, latitude }
}

function parseSearchResults(payload: unknown): TiandituLocationSearchResult[] {
  if (!isRecord(payload) || !isRecord(payload.status)) {
    throw new LocationSearchError('invalid_location_search_response')
  }

  const informationCode = payload.status.infocode
  if (informationCode === 3001) {
    return []
  }
  if (informationCode !== 1000) {
    throw new LocationSearchError('location_search_provider_error')
  }
  if (payload.resultType !== 1 || !Array.isArray(payload.pois) || payload.pois.length > SEARCH_RESULT_LIMIT) {
    throw new LocationSearchError('invalid_location_search_response')
  }

  return payload.pois.map((poi) => {
    if (!isRecord(poi)) {
      throw new LocationSearchError('invalid_location_search_response')
    }

    const id = parseBoundedString(poi.hotPointID, 256)
    const name = parseBoundedString(poi.name, 256)
    const address = poi.address === undefined
      ? ''
      : parseBoundedString(poi.address, 512, true)
    const coordinate = parseCoordinate(poi.lonlat)

    if (id === null || name === null || address === null || coordinate === null) {
      throw new LocationSearchError('invalid_location_search_response')
    }

    return {
      id,
      name,
      address,
      ...coordinate,
    }
  })
}

export async function searchTiandituLocations(
  options: SearchTiandituLocationsOptions,
  fetcher: typeof fetch = fetch,
): Promise<TiandituLocationSearchResult[]> {
  const keyword = options.keyword.trim()
  const token = options.token.trim()

  if (keyword.length === 0 || keyword.length > 100) {
    throw new LocationSearchError('invalid_location_search_keyword')
  }
  if (token.length === 0) {
    throw new LocationSearchError('location_search_token_missing')
  }

  const url = new URL(TIANDITU_SEARCH_ENDPOINT)
  url.searchParams.set('postStr', JSON.stringify({
    keyWord: keyword,
    queryType: 12,
    start: 0,
    count: SEARCH_RESULT_LIMIT,
    specify: HENAN_PROVINCE,
    show: 1,
  }))
  url.searchParams.set('type', 'query')
  url.searchParams.set('tk', token)

  const response = await fetcher(url, { signal: options.signal })
  if (!response.ok) {
    throw new LocationSearchError('location_search_provider_error')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new LocationSearchError('invalid_location_search_response')
  }

  return parseSearchResults(payload)
}

export function tiandituLocationSearchErrorMessage(error: unknown): string | null {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return null
  }
  if (error instanceof TypeError) {
    return '位置搜索网络连接失败，请稍后重试。'
  }
  if (error instanceof LocationSearchError) {
    switch (error.code) {
      case 'invalid_location_search_keyword':
        return '请输入有效的位置关键词。'
      case 'location_search_token_missing':
        return '天地图位置搜索未配置。'
      case 'invalid_location_search_response':
      case 'location_search_provider_error':
        return '位置搜索服务异常，请稍后重试。'
    }
  }

  return '位置搜索失败，请稍后重试。'
}
