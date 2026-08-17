import {
  getSiteSelectionRecommendationBand,
  getSiteSelectionRecommendationBandByKey,
} from './site-selection-recommendation-config'
import {
  getSiteExplorationStatusLabel,
  siteExplorationStatusOptions,
  type SiteExplorationStatus,
} from './site-exploration-status-config'

export {
  getSiteExplorationStatusLabel,
  siteExplorationStatusOptions,
  type SiteExplorationStatus,
} from './site-exploration-status-config'
export type SiteSelectionRecommendation =
  | ''
  | 'needs-review'
  | 'priority'
  | 'recommended'
  | 'cautious'
  | 'paused'

export interface SiteExplorationSite {
  id: string
  siteName: string
  longitude: number
  latitude: number
  city: string
  district: string
  status: SiteExplorationStatus
  explorerName: string
  explorationTeam: string
  explorationDate: string
  overallScore: number | null
  selectionRecommendation: SiteSelectionRecommendation | null
  updatedAt: string
}

export type SiteExplorationFilterOption<Value extends string> = {
  value: Value
  count: number
}

export type SiteExplorationFilterFacet<Value extends string> = {
  total: number
  options: SiteExplorationFilterOption<Value>[]
}

export type SiteExplorationFilterOptions = {
  canFilterByTeam: boolean
  scopeTeamName: string | null
  statuses: SiteExplorationFilterFacet<SiteExplorationStatus>
  teams: SiteExplorationFilterFacet<string>
  explorers: SiteExplorationFilterFacet<string>
  cities: SiteExplorationFilterFacet<string>
  routes: SiteExplorationFilterFacet<string>
}

export function parseSiteExplorationFilterOptions(value: unknown): SiteExplorationFilterOptions {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || Object.keys(value).length !== 7
    || !('canFilterByTeam' in value)
    || typeof value.canFilterByTeam !== 'boolean'
    || !('scopeTeamName' in value)
    || (value.canFilterByTeam
      ? value.scopeTeamName !== null
      : !isBoundedFilterValue(value.scopeTeamName))
    || !('statuses' in value)
    || !('teams' in value)
    || !('explorers' in value)
    || !('cities' in value)
    || !('routes' in value)
  ) throw new Error('malformed_site_exploration_response')

  return {
    canFilterByTeam: value.canFilterByTeam,
    scopeTeamName: value.scopeTeamName as string | null,
    statuses: parseFilterFacet(value.statuses, (optionValue): optionValue is SiteExplorationStatus => (
      typeof optionValue === 'string'
      && siteExplorationStatusOptions.some((option) => option.value === optionValue)
    )),
    teams: parseFilterFacet(value.teams, isBoundedFilterValue),
    explorers: parseFilterFacet(value.explorers, isBoundedFilterValue),
    cities: parseFilterFacet(value.cities, isBoundedFilterValue),
    routes: parseFilterFacet(value.routes, isBoundedFilterValue),
  }
}

function parseFilterFacet<Value extends string>(
  value: unknown,
  isValue: (optionValue: unknown) => optionValue is Value,
): SiteExplorationFilterFacet<Value> {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || Object.keys(value).length !== 2
    || !('total' in value)
    || !('options' in value)
    || !Number.isSafeInteger(value.total)
    || (value.total as number) < 0
    || !Array.isArray(value.options)
    || value.options.length > 100
  ) throw new Error('malformed_site_exploration_response')

  const options = value.options.map((option) => {
    if (
      typeof option !== 'object'
      || option === null
      || Array.isArray(option)
      || Object.keys(option).length !== 2
      || !('value' in option)
      || !('count' in option)
      || !isValue(option.value)
      || !Number.isSafeInteger(option.count)
      || (option.count as number) < 0
    ) throw new Error('malformed_site_exploration_response')
    return { value: option.value, count: option.count as number }
  })
  if (new Set(options.map((option) => option.value)).size !== options.length) {
    throw new Error('malformed_site_exploration_response')
  }

  return { total: value.total as number, options }
}

function isBoundedFilterValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64 && value.trim() === value
}

const siteExplorationSiteSeeds = [
  { id: 'exploration-001', siteName: '航空港物流园重卡充电站', longitude: 113.840000, latitude: 34.520000, city: '郑州市', district: '航空港区', status: 'operating', explorerName: '周建伟', explorationTeam: '一组' },
  { id: 'exploration-002', siteName: '经开区国际物流园候选站', longitude: 113.800000, latitude: 34.720000, city: '郑州市', district: '经开区', status: 'draft', explorerName: '陈雨桐', explorationTeam: '一组' },
  { id: 'exploration-003', siteName: '兰考县国道综合补能站', longitude: 114.820000, latitude: 34.820000, city: '开封市', district: '兰考县', status: 'draft', explorerName: '孙志强', explorationTeam: '一组' },
  { id: 'exploration-004', siteName: '孟津区产业园公共充电站', longitude: 112.450000, latitude: 34.830000, city: '洛阳市', district: '孟津区', status: 'under-construction', explorerName: '刘思远', explorationTeam: '四组' },
  { id: 'exploration-005', siteName: '宝丰县货运枢纽充电站', longitude: 113.050000, latitude: 33.870000, city: '平顶山市', district: '宝丰县', status: 'draft', explorerName: '赵子昂', explorationTeam: '二组' },
  { id: 'exploration-006', siteName: '汤阴县高速口充换电站', longitude: 114.360000, latitude: 35.920000, city: '安阳市', district: '汤阴县', status: 'draft', explorerName: '李浩然', explorationTeam: '三组' },
  { id: 'exploration-007', siteName: '山城区车队专用充电站', longitude: 114.180000, latitude: 35.900000, city: '鹤壁市', district: '山城区', status: 'under-construction', explorerName: '高明宇', explorationTeam: '三组' },
  { id: 'exploration-008', siteName: '原阳县城市配送充电站', longitude: 113.940000, latitude: 35.050000, city: '新乡市', district: '原阳县', status: 'draft', explorerName: '张文博', explorationTeam: '三组' },
  { id: 'exploration-009', siteName: '武陟县物流园重卡充电站', longitude: 113.400000, latitude: 35.100000, city: '焦作市', district: '武陟县', status: 'draft', explorerName: '马会超', explorationTeam: '三组' },
  { id: 'exploration-010', siteName: '华龙区国道综合补能站', longitude: 115.070000, latitude: 35.770000, city: '濮阳市', district: '华龙区', status: 'signed', explorerName: '宋佳宁', explorationTeam: '一组' },
  { id: 'exploration-011', siteName: '建安区停车场光储充站', longitude: 113.830000, latitude: 34.120000, city: '许昌市', district: '建安区', status: 'draft', explorerName: '王立新', explorationTeam: '二组' },
  { id: 'exploration-012', siteName: '召陵区产业园公共充电站', longitude: 114.100000, latitude: 33.590000, city: '漯河市', district: '召陵区', status: 'draft', explorerName: '郭晓峰', explorationTeam: '二组' },
  { id: 'exploration-013', siteName: '陕州区高速口充换电站', longitude: 111.100000, latitude: 34.720000, city: '三门峡市', district: '陕州区', status: 'completed', explorerName: '何俊杰', explorationTeam: '四组' },
  { id: 'exploration-014', siteName: '卧龙区货运枢纽充电站', longitude: 112.530000, latitude: 33.000000, city: '南阳市', district: '卧龙区', status: 'draft', explorerName: '郑凯旋', explorationTeam: '二组' },
  { id: 'exploration-015', siteName: '梁园区物流园重卡充电站', longitude: 115.610000, latitude: 34.440000, city: '商丘市', district: '梁园区', status: 'draft', explorerName: '许安然', explorationTeam: '一组' },
  { id: 'exploration-016', siteName: '平桥区车队专用充电站', longitude: 114.120000, latitude: 32.100000, city: '信阳市', district: '平桥区', status: 'completed', explorerName: '杨晨光', explorationTeam: '二组' },
  { id: 'exploration-017', siteName: '川汇区城市配送充电站', longitude: 114.650000, latitude: 33.620000, city: '周口市', district: '川汇区', status: 'draft', explorerName: '杜海涛', explorationTeam: '一组' },
  { id: 'exploration-018', siteName: '驿城区国道综合补能站', longitude: 114.020000, latitude: 32.980000, city: '驻马店市', district: '驿城区', status: 'draft', explorerName: '冯嘉诚', explorationTeam: '二组' },
  { id: 'exploration-019', siteName: '玉泉街道产业园公共充电站', longitude: 112.610000, latitude: 35.090000, city: '济源市', district: '玉泉街道', status: 'completed', explorerName: '罗宇航', explorationTeam: '四组' },
  { id: 'exploration-020', siteName: '伊滨区停车场光储充站', longitude: 112.600000, latitude: 34.600000, city: '洛阳市', district: '伊滨区', status: 'draft', explorerName: '刘思远', explorationTeam: '四组' },
] as const satisfies readonly Omit<
  SiteExplorationSite,
  'explorationDate' | 'overallScore' | 'selectionRecommendation' | 'updatedAt'
>[]

export const siteExplorationSites: readonly SiteExplorationSite[] = siteExplorationSiteSeeds.map(
  (site, index) => ({
    ...site,
    ...createSiteExplorationTimeline(site.status, index),
    ...createSiteSelectionEvaluation(site.status, index),
  }),
)

export function getSiteSelectionRecommendationLabel(
  recommendation: SiteSelectionRecommendation,
): string {
  if (recommendation === '') return '未评估'
  if (recommendation === 'needs-review') return '补充资料后复评'
  return getSiteSelectionRecommendationBandByKey(recommendation).label
}

export function getSiteExplorationLocation(
  site: Pick<SiteExplorationSite, 'city' | 'district'>,
): string {
  return `${site.city} · ${site.district}`
}

function createSiteExplorationTimeline(
  status: SiteExplorationStatus,
  index: number,
): Pick<SiteExplorationSite, 'explorationDate' | 'updatedAt'> {
  const statusDateOffset = status === 'draft' ? 14 : 0
  const explorationDate = new Date(2026, 6, 15 + statusDateOffset + index % 5)
  const updatedHour = 17 - index % 8
  const updatedMinute = index * 13 % 60

  return {
    explorationDate: formatDate(explorationDate),
    updatedAt: `2026-07-29 ${String(updatedHour).padStart(2, '0')}:${String(updatedMinute).padStart(2, '0')}`,
  }
}

function createSiteSelectionEvaluation(
  status: SiteExplorationStatus,
  index: number,
): Pick<SiteExplorationSite, 'overallScore' | 'selectionRecommendation'> {
  if (status === 'draft') {
    return {
      overallScore: null,
      selectionRecommendation: null,
    }
  }

  const overallScore = 76 + index * 5 % 21
  const selectionRecommendation = getSiteSelectionRecommendationBand(overallScore).key

  return { overallScore, selectionRecommendation }
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
