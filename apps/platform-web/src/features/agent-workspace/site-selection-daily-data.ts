import { siteSelectionRecommendationBands } from '@/features/site-planning/site-selection-recommendation-config'

export const siteSelectionScoreRanges = siteSelectionRecommendationBands.map((band) => ({
  key: band.key,
  label: `${band.label}（${band.scoreLabel}）`,
  shortLabel: band.shortLabel,
  tone: band.indicatorClassName,
}))

export type SiteSelectionScoreRangeKey = (typeof siteSelectionScoreRanges)[number]['key']

export interface SiteSelectionDailyRecord extends Record<SiteSelectionScoreRangeKey, number> {
  date: string
  explorationCount: number
}

export const siteSelectionRecordsByMonth: Record<string, SiteSelectionDailyRecord[]> = {
  '2026-06': [
    { date: '2026-06-23', explorationCount: 7, priority: 1, recommended: 2, cautious: 3, paused: 1 },
    { date: '2026-06-24', explorationCount: 9, priority: 1, recommended: 3, cautious: 4, paused: 1 },
    { date: '2026-06-25', explorationCount: 8, priority: 1, recommended: 2, cautious: 4, paused: 1 },
    { date: '2026-06-26', explorationCount: 10, priority: 1, recommended: 3, cautious: 5, paused: 1 },
    { date: '2026-06-27', explorationCount: 6, priority: 0, recommended: 2, cautious: 3, paused: 1 },
    { date: '2026-06-28', explorationCount: 11, priority: 1, recommended: 3, cautious: 6, paused: 1 },
    { date: '2026-06-29', explorationCount: 12, priority: 2, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-06-30', explorationCount: 9, priority: 1, recommended: 3, cautious: 4, paused: 1 },
  ],
  '2026-07': [
    { date: '2026-07-01', explorationCount: 10, priority: 1, recommended: 3, cautious: 5, paused: 1 },
    { date: '2026-07-02', explorationCount: 12, priority: 2, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-07-03', explorationCount: 9, priority: 1, recommended: 3, cautious: 4, paused: 1 },
    { date: '2026-07-04', explorationCount: 13, priority: 2, recommended: 4, cautious: 6, paused: 1 },
    { date: '2026-07-05', explorationCount: 11, priority: 1, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-07-06', explorationCount: 14, priority: 2, recommended: 5, cautious: 6, paused: 1 },
    { date: '2026-07-07', explorationCount: 12, priority: 2, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-07-08', explorationCount: 15, priority: 2, recommended: 5, cautious: 7, paused: 1 },
    { date: '2026-07-09', explorationCount: 13, priority: 2, recommended: 4, cautious: 6, paused: 1 },
    { date: '2026-07-10', explorationCount: 8, priority: 1, recommended: 3, cautious: 3, paused: 1 },
    { date: '2026-07-11', explorationCount: 11, priority: 1, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-07-12', explorationCount: 9, priority: 1, recommended: 3, cautious: 4, paused: 1 },
    { date: '2026-07-13', explorationCount: 14, priority: 2, recommended: 5, cautious: 6, paused: 1 },
    { date: '2026-07-14', explorationCount: 12, priority: 2, recommended: 4, cautious: 5, paused: 1 },
    { date: '2026-07-15', explorationCount: 16, priority: 3, recommended: 5, cautious: 7, paused: 1 },
    { date: '2026-07-16', explorationCount: 18, priority: 3, recommended: 6, cautious: 8, paused: 1 },
  ],
}

export function getRecentSiteSelectionRecords(monthKey: string, count: number): readonly SiteSelectionDailyRecord[] {
  const records = siteSelectionRecordsByMonth[monthKey]
  if (!records || records.length < count) {
    throw new Error(`Site selection records for ${monthKey} require at least ${count} days`)
  }
  return records.slice(-count)
}

export function formatSiteSelectionChartDate(date: string): string {
  const [, month, day] = date.split('-')
  if (!month || !day) throw new Error(`Invalid site selection date: ${date}`)
  return `${Number(month)}月${Number(day)}日`
}
