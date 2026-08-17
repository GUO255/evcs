import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

export type MapDrawingPosition = [number, number, ...number[]]

export type MapDrawingGeoJson = {
  type: 'Feature'
  properties: Record<string, never>
  geometry:
    | { type: 'LineString'; coordinates: MapDrawingPosition[] }
    | { type: 'Polygon'; coordinates: MapDrawingPosition[][] }
}

export type MapDrawingCorridorType = 'main' | 'secondary' | 'branch'

export type MapDrawing = {
  id: string
  name: string
  geoJson: MapDrawingGeoJson
  corridorType: MapDrawingCorridorType | null
  showName: boolean
  remark: string
  createdAt: number
  updatedAt: number
}

export type MapDrawingInput = Pick<
  MapDrawing,
  'name' | 'geoJson' | 'corridorType' | 'showName' | 'remark'
>

const basePath = '/api/intelligent-site-selection/map-drawings'
const errorMessages: Record<string, string> = {
  invalid_token: '当前登录状态无法访问选址绘制数据。',
  insufficient_scope: '当前账号没有修改选址绘制数据的权限。',
  business_access_denied: '当前账号无法访问选址绘制数据。',
  invalid_drawing: '绘制数据格式不正确。',
  invalid_drawing_name: '请输入 1 至 128 个字符的名称。',
  invalid_drawing_remark: '备注不能超过 1000 个字符。',
  invalid_drawing_geojson: '地图图形数据格式不正确。',
  invalid_drawing_corridor_type: '请选择有效的线路类型。',
  invalid_drawing_name_visibility: '请选择是否在地图上显示名称。',
  drawing_geojson_too_large: '地图图形数据超过大小限制。',
  map_drawing_load_failed: '绘制数据加载失败，请稍后重试。',
  map_drawing_create_failed: '绘制数据保存失败，请稍后重试。',
  map_drawing_update_failed: '绘制数据更新失败，请稍后重试。',
  map_drawing_delete_failed: '绘制数据删除失败，请稍后重试。',
  map_drawing_not_found: '绘制数据已不存在。',
}

export class MapDrawingApiError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, message: string) {
    super(message)
    this.name = 'MapDrawingApiError'
  }
}

export function mapDrawingErrorMessage(error: unknown): string | null {
  if (error instanceof MapDrawingApiError) return error.message
  return error instanceof TypeError
    ? '网络连接失败，请稍后重试。'
    : '地图绘制数据处理失败，请刷新后重试。'
}

export async function listAllMapDrawings(): Promise<MapDrawing[]> {
  const drawings: MapDrawing[] = []
  const seenCursors = new Set<string>()
  let cursor: string | null = null

  do {
    const query = new URLSearchParams({ limit: '500' })
    if (cursor) query.set('cursor', cursor)
    const response = await request(`${basePath}?${query.toString()}`)
    const page = parsePage(await response.json())
    drawings.push(...page.items)
    cursor = page.nextCursor
    if (cursor && seenCursors.has(cursor)) throw malformedResponse()
    if (cursor) seenCursors.add(cursor)
  } while (cursor)

  return drawings
}

export async function createMapDrawing(input: MapDrawingInput): Promise<MapDrawing> {
  const response = await request(basePath, mutation('POST', input))
  return parseMapDrawing(await response.json())
}

export async function updateMapDrawing(id: string, input: MapDrawingInput): Promise<MapDrawing> {
  const response = await request(`${basePath}/${encodeURIComponent(id)}`, mutation('PATCH', input))
  return parseMapDrawing(await response.json())
}

export async function deleteMapDrawing(id: string): Promise<void> {
  const response = await request(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (response.status !== 204) throw malformedResponse()
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await authenticatedFetch(`${siteSelectionGatewayBase}${path}`, init)
  if (response.ok) return response

  let code: string | undefined
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && hasExactKeys(body, ['error']) && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // Response bodies outside the API contract are intentionally hidden.
  }
  const message = code ? errorMessages[code] : undefined
  throw new MapDrawingApiError(
    response.status,
    code,
    message ?? '选址绘制服务请求失败，请稍后重试。',
  )
}

function mutation(method: 'POST' | 'PATCH', body: MapDrawingInput): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function parsePage(value: unknown): { items: MapDrawing[]; nextCursor: string | null } {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ['items', 'nextCursor'])
    || !Array.isArray(value.items)
    || (value.nextCursor !== null && !isId(value.nextCursor))
  ) {
    throw malformedResponse()
  }
  return {
    items: value.items.map(parseMapDrawing),
    nextCursor: value.nextCursor as string | null,
  }
}

function parseMapDrawing(value: unknown): MapDrawing {
  if (
    !isRecord(value)
    || !hasExactKeys(
      value,
      ['id', 'name', 'geoJson', 'corridorType', 'showName', 'remark', 'createdAt', 'updatedAt'],
    )
    || !isId(value.id)
    || typeof value.name !== 'string'
    || !value.name
    || typeof value.showName !== 'boolean'
    || typeof value.remark !== 'string'
    || !isTimestamp(value.createdAt)
    || !isTimestamp(value.updatedAt)
  ) {
    throw malformedResponse()
  }
  const geoJson = parseGeoJson(value.geoJson)
  const corridorType = parseCorridorType(value.corridorType)
  if (geoJson.geometry.type === 'Polygon' && corridorType !== null) throw malformedResponse()
  return {
    id: value.id,
    name: value.name,
    geoJson,
    corridorType,
    showName: value.showName,
    remark: value.remark,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function parseCorridorType(value: unknown): MapDrawingCorridorType | null {
  if (value === null) return null
  if (value === 'main' || value === 'secondary' || value === 'branch') return value
  throw malformedResponse()
}

function parseGeoJson(value: unknown): MapDrawingGeoJson {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ['type', 'properties', 'geometry'])
    || value.type !== 'Feature'
    || !isRecord(value.properties)
    || Object.keys(value.properties).length !== 0
    || !isRecord(value.geometry)
    || !hasExactKeys(value.geometry, ['type', 'coordinates'])
  ) {
    throw malformedResponse()
  }

  if (value.geometry.type === 'LineString') {
    if (!Array.isArray(value.geometry.coordinates) || value.geometry.coordinates.length < 2) {
      throw malformedResponse()
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: value.geometry.coordinates.map(parsePosition),
      },
    }
  }
  if (value.geometry.type === 'Polygon') {
    if (!Array.isArray(value.geometry.coordinates) || value.geometry.coordinates.length < 1) {
      throw malformedResponse()
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: value.geometry.coordinates.map((ring) => {
          if (!Array.isArray(ring) || ring.length < 4) throw malformedResponse()
          return ring.map(parsePosition)
        }),
      },
    }
  }
  throw malformedResponse()
}

function parsePosition(value: unknown): MapDrawingPosition {
  if (
    !Array.isArray(value)
    || value.length < 2
    || value.length > 3
    || !value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  ) {
    throw malformedResponse()
  }
  return value as MapDrawingPosition
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/u.test(value)
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort()
  const expectedKeys = [...keys].sort()
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index])
}

function malformedResponse(): MapDrawingApiError {
  return new MapDrawingApiError(
    502,
    'malformed_response',
    '选址绘制服务返回了无效数据。',
  )
}
