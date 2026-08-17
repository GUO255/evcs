import type { StyleSpecification } from 'maplibre-gl'

export function createTiandituStyle(token: string, baseLayer: 'vector' | 'satellite' = 'vector'): StyleSpecification {
  return {
    version: 8,
    sources: {
      'tianditu-vector': {
        type: 'raster',
        tiles: createTiandituTileUrls('vec', token),
        tileSize: 256,
        maxzoom: 18,
        attribution: '天地图',
      },
      'tianditu-vector-labels': {
        type: 'raster',
        tiles: createTiandituTileUrls('cva', token),
        tileSize: 256,
        maxzoom: 18,
        attribution: '天地图',
      },
      'tianditu-satellite': {
        type: 'raster',
        tiles: createTiandituTileUrls('img', token),
        tileSize: 256,
        maxzoom: 18,
        attribution: '天地图',
      },
      'tianditu-satellite-labels': {
        type: 'raster',
        tiles: createTiandituTileUrls('cia', token),
        tileSize: 256,
        maxzoom: 18,
        attribution: '天地图',
      },
    },
    layers: [
      { id: 'tianditu-vector', type: 'raster', source: 'tianditu-vector', layout: { visibility: baseLayer === 'vector' ? 'visible' : 'none' } },
      { id: 'tianditu-vector-labels', type: 'raster', source: 'tianditu-vector-labels', layout: { visibility: baseLayer === 'vector' ? 'visible' : 'none' } },
      {
        id: 'tianditu-satellite',
        type: 'raster',
        source: 'tianditu-satellite',
        layout: { visibility: baseLayer === 'satellite' ? 'visible' : 'none' },
      },
      {
        id: 'tianditu-satellite-labels',
        type: 'raster',
        source: 'tianditu-satellite-labels',
        layout: { visibility: baseLayer === 'satellite' ? 'visible' : 'none' },
      },
    ],
  }
}

function createTiandituTileUrls(
  layer: 'vec' | 'cva' | 'img' | 'cia',
  token: string,
): string[] {
  const encodedToken = encodeURIComponent(token)
  return Array.from({ length: 8 }, (_, index) => (
    `https://t${index}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${encodedToken}`
  ))
}
