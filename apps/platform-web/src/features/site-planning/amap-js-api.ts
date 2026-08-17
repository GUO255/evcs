import { env } from '@/config/env'

export type AmapLngLat = {
  getLng?: () => number
  getLat?: () => number
  lng?: number
  lat?: number
}

export type AmapPoi = {
  id?: string
  name?: string
  address?: string | string[]
  pname?: string
  cityname?: string | string[]
  adname?: string
  type?: string
  distance?: number | string
  location?: AmapLngLat
}

export type AmapPlaceSearchResult = {
  info?: string
  poiList?: { pois?: AmapPoi[] }
}

export type AmapPlaceSearch = {
  clear: () => void
  searchNearBy: (
    keyword: string,
    center: [number, number],
    radius: number,
    callback: (status: string, result: AmapPlaceSearchResult) => void,
  ) => void
}

export type AmapDrivingStep = {
  path?: AmapLngLat[]
}

export type AmapDrivingRoute = {
  distance?: number | string
  steps?: AmapDrivingStep[]
}

export type AmapDrivingResult = {
  info?: string
  routes?: AmapDrivingRoute[]
}

export type AmapDriving = {
  clear: () => void
  search: (
    origin: [number, number],
    destination: [number, number],
    callback: (status: string, result: AmapDrivingResult) => void,
  ) => void
}

export type AmapNamespace = {
  PlaceSearch: new (options: Record<string, unknown>) => AmapPlaceSearch
  Driving: new (options?: Record<string, unknown>) => AmapDriving
  plugin: (plugins: string | string[], callback: () => void) => void
}

export type AmapPluginName = 'AMap.PlaceSearch' | 'AMap.Driving'

declare global {
  interface Window {
    AMap?: AmapNamespace
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

const amapKey = env.maps.amapKey
const amapSecurityJsCode = env.maps.amapSecurityJsCode
const scriptId = 'evcs-amap-js-api'
const loadTimeoutMilliseconds = 15_000
let corePromise: Promise<AmapNamespace> | null = null

export function hasAmapConfiguration(): boolean {
  return Boolean(amapKey && amapSecurityJsCode)
}

export async function loadAmapPlugins(
  pluginNames: readonly AmapPluginName[],
): Promise<AmapNamespace> {
  const amap = await loadAmapCore()
  const uniquePluginNames = [...new Set(pluginNames)]
  if (uniquePluginNames.length === 0) return amap
  await new Promise<void>((resolve) => amap.plugin(uniquePluginNames, resolve))
  return amap
}

function loadAmapCore(): Promise<AmapNamespace> {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (!hasAmapConfiguration()) {
    return Promise.reject(new Error('missing_amap_configuration'))
  }
  if (corePromise) return corePromise

  window._AMapSecurityConfig = { securityJsCode: amapSecurityJsCode }
  corePromise = new Promise<AmapNamespace>((resolve, reject) => {
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    const script = existingScript ?? document.createElement('script')
    let settled = false
    const timeoutId = window.setTimeout(() => finish(() => reject(new Error('amap_script_load_timeout'))), loadTimeoutMilliseconds)
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      callback()
    }
    const handleLoad = () => finish(() => (
      window.AMap ? resolve(window.AMap) : reject(new Error('invalid_amap_response'))
    ))
    const handleError = () => finish(() => reject(new Error('amap_script_load_failed')))

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)
    if (!existingScript) {
      script.id = scriptId
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapKey)}`
      script.async = true
      document.head.append(script)
    }
  }).catch((error) => {
    corePromise = null
    throw error
  })
  return corePromise
}
