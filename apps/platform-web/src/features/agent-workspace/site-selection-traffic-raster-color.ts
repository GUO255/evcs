import maplibregl, { type AddProtocolAction } from 'maplibre-gl'

import { authenticatedFetch } from '@/auth/browser-auth-client'

const protocolPrefix = 'site-selection-traffic'
const colorStops = [
  { alpha: 0, blue: 248, gray: 0, green: 189, red: 56 },
  { alpha: 115, blue: 212, gray: 32, green: 182, red: 6 },
  { alpha: 173, blue: 94, gray: 64, green: 197, red: 34 },
  { alpha: 230, blue: 21, gray: 96, green: 204, red: 250 },
  { alpha: 235, blue: 11, gray: 128, green: 158, red: 245 },
  { alpha: 240, blue: 22, gray: 159, green: 115, red: 249 },
  { alpha: 245, blue: 68, gray: 191, green: 68, red: 239 },
  { alpha: 247, blue: 38, gray: 223, green: 38, red: 220 },
  { alpha: 250, blue: 27, gray: 255, green: 27, red: 153 },
] as const

function buildColorLookup() {
  const lookup = new Uint8ClampedArray(256 * 4)
  for (let gray = 0; gray <= 255; gray += 1) {
    const rightIndex = colorStops.findIndex((stop) => stop.gray >= gray)
    const right = colorStops[Math.max(0, rightIndex)]!
    const left = colorStops[Math.max(0, rightIndex - 1)] ?? right
    const progress = right.gray === left.gray ? 0 : (gray - left.gray) / (right.gray - left.gray)
    const offset = gray * 4
    lookup[offset] = Math.round(left.red + (right.red - left.red) * progress)
    lookup[offset + 1] = Math.round(left.green + (right.green - left.green) * progress)
    lookup[offset + 2] = Math.round(left.blue + (right.blue - left.blue) * progress)
    lookup[offset + 3] = Math.round(left.alpha + (right.alpha - left.alpha) * progress)
  }
  return lookup
}

const colorLookup = buildColorLookup()
const blurRadius = 4
const blurKernel = (() => {
  const sigma = 2.2
  const kernel = new Float32Array(blurRadius * 2 + 1)
  let total = 0
  for (let index = -blurRadius; index <= blurRadius; index += 1) {
    const weight = Math.exp(-(index * index) / (2 * sigma * sigma))
    kernel[index + blurRadius] = weight
    total += weight
  }
  for (let index = 0; index < kernel.length; index += 1) kernel[index] = kernel[index]! / total
  return kernel
})()

function blurGrayscale(source: Uint8ClampedArray, width: number, height: number) {
  const horizontal = new Float32Array(width * height)
  const output = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0
      for (let offset = -blurRadius; offset <= blurRadius; offset += 1) {
        const sampleX = Math.max(0, Math.min(width - 1, x + offset))
        value += source[(y * width + sampleX) * 4]! * blurKernel[offset + blurRadius]!
      }
      horizontal[y * width + x] = value
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0
      for (let offset = -blurRadius; offset <= blurRadius; offset += 1) {
        const sampleY = Math.max(0, Math.min(height - 1, y + offset))
        value += horizontal[sampleY * width + x]! * blurKernel[offset + blurRadius]!
      }
      output[y * width + x] = Math.round(value)
    }
  }
  return output
}

async function colorizeTile(url: string, signal: AbortSignal) {
  const sourceUrl = url.replace(new RegExp(`^${protocolPrefix}-(https?):`), '$1:')
  const response = await authenticatedFetch(sourceUrl, { signal })
  if (!response.ok) throw new Error(`traffic_heatmap_tile_failed:${response.status}`)
  const source = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('traffic_heatmap_colorization_unsupported')
  context.drawImage(source, 0, 0)
  source.close()
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const grayscale = blurGrayscale(image.data, canvas.width, canvas.height)
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const colorOffset = grayscale[offset / 4]! * 4
    image.data[offset] = colorLookup[colorOffset]!
    image.data[offset + 1] = colorLookup[colorOffset + 1]!
    image.data[offset + 2] = colorLookup[colorOffset + 2]!
    image.data[offset + 3] = colorLookup[colorOffset + 3]!
  }
  context.putImageData(image, 0, 0)
  return createImageBitmap(canvas)
}

const protocolHandler: AddProtocolAction = async (request, abortController) => ({
  data: await colorizeTile(request.url, abortController.signal),
})

export function registerSiteSelectionTrafficRasterProtocols() {
  maplibregl.addProtocol(`${protocolPrefix}-http`, protocolHandler)
  maplibregl.addProtocol(`${protocolPrefix}-https`, protocolHandler)
  return () => {
    maplibregl.removeProtocol(`${protocolPrefix}-http`)
    maplibregl.removeProtocol(`${protocolPrefix}-https`)
  }
}

export function toSiteSelectionTrafficRasterUrl(url: string) {
  const absoluteUrl = /^https?:/.test(url)
    ? url
    : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
  return absoluteUrl.replace(/^(https?):/, `${protocolPrefix}-$1:`)
}
