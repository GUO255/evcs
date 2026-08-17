import { siteSelectionRecords } from './site-selection-record-data'

export type SiteScoreCategory =
  | 'exploring'
  | 'score-90-100'
  | 'score-80-89'
  | 'score-70-79'
  | 'score-60-69'
  | 'score-below-60'

export interface SiteSelectionMapSite {
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
  score: number | null
  category: SiteScoreCategory
  exploredAt: string
}

export const siteScoreCategories = [
  { id: 'exploring', label: '勘探中', tone: 'bg-muted-foreground' },
  { id: 'score-90-100', label: '90–100', tone: 'bg-chart-5' },
  { id: 'score-80-89', label: '80–89', tone: 'bg-chart-4' },
  { id: 'score-70-79', label: '70–79', tone: 'bg-chart-3' },
  { id: 'score-60-69', label: '60–69', tone: 'bg-chart-2' },
  { id: 'score-below-60', label: '60 以下', tone: 'bg-chart-1' },
] as const satisfies ReadonlyArray<{ id: SiteScoreCategory; label: string; tone: string }>

export const siteSelectionMapSites: readonly SiteSelectionMapSite[] = siteSelectionRecords.map((record) => ({
  id: record.id,
  name: record.siteName,
  address: `河南省${record.region}`,
  longitude: record.longitude,
  latitude: record.latitude,
  score: record.overallScore,
  category: getSiteScoreCategory(record.overallScore),
  exploredAt: record.exploredAt,
}))

export function getSiteScoreCategory(score: number | null): SiteScoreCategory {
  if (score === null) return 'exploring'
  if (score >= 90) return 'score-90-100'
  if (score >= 80) return 'score-80-89'
  if (score >= 70) return 'score-70-79'
  if (score >= 60) return 'score-60-69'
  return 'score-below-60'
}

export function getSiteSelectionMapData() {
  return { categories: siteScoreCategories, sites: siteSelectionMapSites }
}
