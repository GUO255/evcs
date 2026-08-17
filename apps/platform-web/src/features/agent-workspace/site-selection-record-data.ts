export interface SiteSelectionRecord {
  id: string
  siteName: string
  region: string
  longitude: number
  latitude: number
  ownershipComplianceScore: number
  geographicEnvironmentScore: number
  powerScore: number
  siteConditionScore: number
  fleetCooperationScore: number
  overallScore: number
  exploredAt: string
  report: string
}

const locations = [
  { name: '郑州市航空港区', longitude: 113.84, latitude: 34.52 },
  { name: '郑州市经开区', longitude: 113.80, latitude: 34.72 },
  { name: '开封市兰考县', longitude: 114.82, latitude: 34.82 },
  { name: '洛阳市孟津区', longitude: 112.45, latitude: 34.83 },
  { name: '平顶山市宝丰县', longitude: 113.05, latitude: 33.87 },
  { name: '安阳市汤阴县', longitude: 114.36, latitude: 35.92 },
  { name: '鹤壁市山城区', longitude: 114.18, latitude: 35.90 },
  { name: '新乡市原阳县', longitude: 113.94, latitude: 35.05 },
  { name: '焦作市武陟县', longitude: 113.40, latitude: 35.10 },
  { name: '濮阳市华龙区', longitude: 115.07, latitude: 35.77 },
  { name: '许昌市建安区', longitude: 113.83, latitude: 34.12 },
  { name: '漯河市召陵区', longitude: 114.10, latitude: 33.59 },
  { name: '三门峡市陕州区', longitude: 111.10, latitude: 34.72 },
  { name: '南阳市卧龙区', longitude: 112.53, latitude: 33.00 },
  { name: '商丘市梁园区', longitude: 115.61, latitude: 34.44 },
  { name: '信阳市平桥区', longitude: 114.12, latitude: 32.10 },
  { name: '周口市川汇区', longitude: 114.65, latitude: 33.62 },
  { name: '驻马店市驿城区', longitude: 114.02, latitude: 32.98 },
  { name: '济源市玉泉街道', longitude: 112.61, latitude: 35.09 },
  { name: '洛阳市伊滨区', longitude: 112.60, latitude: 34.60 },
] as const

const siteTypes = [
  '物流园重卡充电站', '国道综合补能站', '高速口充换电站', '产业园公共充电站',
  '货运枢纽充电站', '停车场光储充站', '车队专用充电站', '城市配送充电站',
] as const

const scoreBands = [
  { count: 18, min: 90, max: 100 },
  { count: 42, min: 80, max: 89 },
  { count: 36, min: 70, max: 79 },
  { count: 21, min: 60, max: 69 },
  { count: 11, min: 52, max: 59 },
] as const

export const siteSelectionRecords: readonly SiteSelectionRecord[] = scoreBands.flatMap((band, bandIndex) => (
  Array.from({ length: band.count }, (_, bandRecordIndex) => {
    const recordIndex = scoreBands
      .slice(0, bandIndex)
      .reduce((total, previousBand) => total + previousBand.count, 0) + bandRecordIndex
    const overallScore = band.min + ((bandRecordIndex * 7 + bandIndex * 3) % (band.max - band.min + 1))
    const ownershipComplianceScore = createDimensionScore(overallScore, recordIndex, 2)
    const geographicEnvironmentScore = createDimensionScore(overallScore, recordIndex, 5)
    const powerScore = createDimensionScore(overallScore, recordIndex, 7)
    const siteConditionScore = createDimensionScore(overallScore, recordIndex, 11)
    const fleetCooperationScore = createDimensionScore(overallScore, recordIndex, 13)
    const location = getLocation(recordIndex)
    const coordinates = createSiteCoordinates(recordIndex, location)
    const siteName = createSiteName(recordIndex, location.name)

    return {
      id: `site-selection-${String(recordIndex + 1).padStart(3, '0')}`,
      siteName,
      region: location.name,
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      ownershipComplianceScore,
      geographicEnvironmentScore,
      powerScore,
      siteConditionScore,
      fleetCooperationScore,
      overallScore,
      exploredAt: createExplorationTime(recordIndex),
      report: createSiteReport({
        siteName,
        ownershipComplianceScore,
        geographicEnvironmentScore,
        powerScore,
        siteConditionScore,
        fleetCooperationScore,
        overallScore,
      }),
    }
  })
))

function getLocation(recordIndex: number) {
  const location = locations[recordIndex % locations.length]
  if (!location) throw new Error(`Unable to find location for record ${recordIndex}`)
  return location
}

function createSiteName(recordIndex: number, locationName: string): string {
  const siteType = siteTypes[Math.floor(recordIndex / locations.length) % siteTypes.length]
  if (!siteType) throw new Error(`Unable to create site name for record ${recordIndex}`)
  return `${locationName}${siteType}候选点 ${String(recordIndex + 1).padStart(3, '0')}`
}

function createSiteCoordinates(recordIndex: number, location: (typeof locations)[number]) {
  const localSequence = Math.floor(recordIndex / locations.length)
  const angle = recordIndex * 137.508 * Math.PI / 180
  const radius = 0.025 + localSequence * 0.012

  return {
    longitude: Number((location.longitude + Math.cos(angle) * radius).toFixed(6)),
    latitude: Number((location.latitude + Math.sin(angle) * radius * 0.72).toFixed(6)),
  }
}

function createDimensionScore(overallScore: number, recordIndex: number, salt: number): number {
  const offset = ((recordIndex * salt + salt * 3) % 13) - 6
  return Math.min(100, Math.max(45, overallScore + offset))
}

function createExplorationTime(recordIndex: number): string {
  const exploredAt = new Date(2026, 6, 16, 17, 30 - recordIndex * 180)
  const year = exploredAt.getFullYear()
  const month = String(exploredAt.getMonth() + 1).padStart(2, '0')
  const day = String(exploredAt.getDate()).padStart(2, '0')
  const hour = String(exploredAt.getHours()).padStart(2, '0')
  const minute = String(exploredAt.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

type SiteReportScores = Pick<SiteSelectionRecord,
  | 'siteName'
  | 'ownershipComplianceScore'
  | 'geographicEnvironmentScore'
  | 'powerScore'
  | 'siteConditionScore'
  | 'fleetCooperationScore'
  | 'overallScore'
>

function createSiteReport(scores: SiteReportScores): string {
  const recommendation = scores.overallScore >= 90
    ? '建议列入优先推进清单，启动商务确认和建设方案深化。'
    : scores.overallScore >= 80
      ? '建议补充关键约束资料后进入下一轮决策评审。'
      : scores.overallScore >= 70
        ? '建议重点优化电力接入或场地条件后重新评估。'
        : '当前不建议优先推进，待核心约束解决后再启动复评。'

  return `${scores.siteName}综合得分 ${scores.overallScore} 分。权属合规 ${scores.ownershipComplianceScore} 分、地理环境 ${scores.geographicEnvironmentScore} 分、电力接入 ${scores.powerScore} 分、场地条件 ${scores.siteConditionScore} 分、合作车队 ${scores.fleetCooperationScore} 分。${recommendation}`
}

export function getSiteSelectionRecordData() {
  return siteSelectionRecords
}
