import type { SiteExplorationInput } from './site-exploration-api'

export const explorationOptions = {
  accessConvenience: [
    { value: '', label: '未评估' }, { value: 'excellent', label: '非常便利' },
    { value: 'good', label: '便利' }, { value: 'average', label: '一般' },
  ],
  landType: [
    { value: '', label: '未选择' }, { value: 'construction', label: '建设用地' },
    { value: 'collective-commercial', label: '集体经营性建设用地' },
    { value: 'allocated', label: '划拨用地' }, { value: 'other', label: '其他' },
  ],
  groundHardening: [
    { value: '', label: '未评估' }, { value: 'good', label: '硬化良好' },
    { value: 'needs-hardening', label: '需要硬化' }, { value: 'unhardened', label: '未硬化' },
  ],
  terrainCondition: [
    { value: '', label: '未评估' }, { value: 'well-drained', label: '排水良好' },
    { value: 'flat', label: '地势平坦' }, { value: 'low-lying', label: '低洼' },
  ],
  cooperationMode: [
    { value: '', label: '未确定' }, { value: 'service-fee-share', label: '服务费分成' },
    { value: 'net-profit-share', label: '净利润分成' }, { value: 'fixed-rent', label: '固定租金' },
  ],
  siteMaturity: [
    { value: '', label: '未评估' }, { value: 'a', label: 'A 类（条件成熟）' },
    { value: 'b', label: 'B 类（需补充条件）' }, { value: 'c', label: 'C 类（暂不推进）' },
  ],
} as const

export function createEmptySiteExplorationInput(): SiteExplorationInput {
  return {
    projectName: '', contactName: '', contactPhone: '',
    provinceCity: '', countyDistrict: '', locationAddress: '', longitude: 0, latitude: 0,
    locationSnapshot: null,
    highwayDistanceMeters: 0, highwayDistanceGeoJson: null, highwayDistanceSnapshot: null, highwayEntrance: null,
    highwayRoutes: [],
    siteAreaSquareMeters: 0, siteBoundaryGeoJson: null,
    siteBoundarySnapshot: null,
    arterialRoadDistanceMeters: 0, arterialRoadDistanceGeoJson: null, arterialRoadDistanceSnapshot: null,
    arterialRoadTrafficGeoJson: null,
    accessConvenience: '', landQualified: false, landType: '', landTypeDescription: '',
    hasLandProof: false, hasLeaseAgreement: false, hasOtherStructures: false,
    groundHardening: '', terrainCondition: '', capacityDescription: '',
    transportCapacityDescription: '', nearbyTruckChargingStations: [],
    nearbyTruckChargingStationSnapshot: null, nearbyTaskStations: [],
    nearbyTaskStationSnapshot: null, nearbyHotspotAreas: [],
    nearbyHotspotAreaSnapshot: null, cooperationMode: '', cooperationTerms: '',
    siteMaturity: '', importantNotes: '',
    powerAccessMethod: '', electricityNature: '', highVoltageAccessMethod: '',
    tenKvLineAccessDistanceMeters: null,
    competitors: [{ stationName: '', scale: '', modelQuantity: '', utilizationRate: '', electricityPrice: '' }],
    surveyRecommendation: '', chargingPileModel: '', chargingPileQuantity: null,
    transformerCapacity: '', transformerQuantity: null, preliminaryDesignNotes: '',
  }
}
