export const siteSelectionRecommendationBands = [
  {
    key: 'priority',
    label: '优先推进',
    scoreLabel: '≥85分',
    shortLabel: '优先',
    minimumScore: 85,
    indicatorClassName: 'bg-orange-500',
    scoreRingClassName: 'border-orange-500',
    badgeClassName: 'border-orange-500 bg-orange-500 text-white dark:border-orange-500 dark:bg-orange-500 dark:text-white',
  },
  {
    key: 'recommended',
    label: '建议推进',
    scoreLabel: '75–84分',
    shortLabel: '建议',
    minimumScore: 75,
    indicatorClassName: 'bg-green-500',
    scoreRingClassName: 'border-green-500',
    badgeClassName: 'border-green-500 bg-green-500 text-white dark:border-green-500 dark:bg-green-500 dark:text-white',
  },
  {
    key: 'cautious',
    label: '谨慎推进',
    scoreLabel: '60–74分',
    shortLabel: '谨慎',
    minimumScore: 60,
    indicatorClassName: 'bg-blue-500',
    scoreRingClassName: 'border-blue-500',
    badgeClassName: 'border-blue-500 bg-blue-500 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white',
  },
  {
    key: 'paused',
    label: '暂缓推进',
    scoreLabel: '<60分',
    shortLabel: '暂停',
    minimumScore: 0,
    indicatorClassName: 'bg-gray-500',
    scoreRingClassName: 'border-gray-500',
    badgeClassName: 'border-gray-500 bg-gray-500 text-white dark:border-gray-400 dark:bg-gray-400 dark:text-gray-950',
  },
] as const

export type SiteSelectionRecommendationBandKey = (typeof siteSelectionRecommendationBands)[number]['key']

export function getSiteSelectionRecommendationBand(score: number) {
  const band = siteSelectionRecommendationBands.find(({ minimumScore }) => score >= minimumScore)
  if (!band) throw new Error(`Invalid site selection score: ${score}`)
  return band
}

export function getSiteSelectionRecommendationBandByKey(key: SiteSelectionRecommendationBandKey) {
  const band = siteSelectionRecommendationBands.find((item) => item.key === key)
  if (!band) throw new Error(`Unknown site selection recommendation band: ${key}`)
  return band
}
