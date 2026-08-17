import type { SiteExplorationImage } from './site-exploration-api'
import type { SiteSelectionRecommendation } from './site-exploration-data'
import { MAX_SITE_EXPLORATION_FILE_BYTES } from './site-exploration-file-limits'

export type SiteExplorationDailyListItem = {
  id: string
  projectName: string
  provinceCity: string
  countyDistrict: string
  locationSnapshot: SiteExplorationImage | null
  siteBoundarySnapshot: SiteExplorationImage | null
  explorationDate: string
  overallScore: number
  selectionRecommendation: SiteSelectionRecommendation
  updatedAt: number
}

export type SiteExplorationDailyPage = {
  items: SiteExplorationDailyListItem[]
  nextCursor: string | null
}

const recommendations: readonly SiteSelectionRecommendation[] = [
  '',
  'needs-review',
  'priority',
  'recommended',
  'cautious',
  'paused',
]

export function parseSiteExplorationDailyPage(value: unknown): SiteExplorationDailyPage {
  if (
    !isRecord(value)
    || !exactKeys(value, ['items', 'nextCursor'])
    || !Array.isArray(value.items)
    || (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  ) throw malformedResponse()

  return {
    items: value.items.map(parseDailyListItem),
    nextCursor: value.nextCursor,
  }
}

function parseDailyListItem(value: unknown): SiteExplorationDailyListItem {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      'id',
      'projectName',
      'provinceCity',
      'countyDistrict',
      'locationSnapshot',
      'siteBoundarySnapshot',
      'explorationDate',
      'overallScore',
      'selectionRecommendation',
      'updatedAt',
    ])
    || !isBoundedString(value.id, 20)
    || !isBoundedString(value.projectName, 128)
    || !isBoundedString(value.provinceCity, 64)
    || !isBoundedString(value.countyDistrict, 64)
    || !(value.locationSnapshot === null || isSiteExplorationImage(value.locationSnapshot))
    || !(value.siteBoundarySnapshot === null || isSiteExplorationImage(value.siteBoundarySnapshot))
    || !/^\d{4}-\d{2}-\d{2}$/u.test(String(value.explorationDate))
    || !isInteger(value.overallScore, 0, 100)
    || !recommendations.includes(value.selectionRecommendation as SiteSelectionRecommendation)
    || !isInteger(value.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  ) throw malformedResponse()

  return value as SiteExplorationDailyListItem
}

function isSiteExplorationImage(value: unknown): value is SiteExplorationImage {
  return isRecord(value)
    && exactKeys(value, ['objectKey', 'url', 'originalName', 'contentType', 'size'])
    && isBoundedString(value.objectKey, 1024)
    && isBoundedString(value.url, 4096)
    && isBoundedString(value.originalName, 255)
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.contentType))
    && isInteger(value.size, 1, MAX_SITE_EXPLORATION_FILE_BYTES)
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const expectedKeys = [...expected].sort()
  const actualKeys = Object.keys(value).sort()
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index])
}

function malformedResponse(): Error {
  return new Error('malformed_site_exploration_response')
}
