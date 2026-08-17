import { Fragment, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

import type {
  SiteExplorationImage,
  SiteExplorationRecord,
} from './site-exploration-api'
import { SiteExplorationArterialRoadSummary } from './site-exploration-arterial-road-summary'
import { SiteExplorationChargingStationIcon } from './site-exploration-charging-station-icon'
import { explorationOptions } from './site-exploration-fields'
import { formatHighwayDistance } from './site-exploration-highway-distance'
import { calculatePolygonPerimeterMeters } from './site-exploration-geometry'
import { SiteExplorationHotspotIcon } from './site-exploration-hotspot-icon'
import { formatNearbyPlaceDistance } from './site-exploration-nearby-place-distance'

type SummaryRowKind = 'arterial-road' | 'nearby-stations' | 'nearby-hotspots'
type SummaryImageGroup = {
  label: string
  images: readonly SiteExplorationImage[]
}
type SummaryRow = readonly [
  label: string,
  value: string,
  kind?: SummaryRowKind,
  imageGroups?: readonly SummaryImageGroup[],
]
type SummarySection = {
  title: string
  rows: SummaryRow[]
}

export function SiteExplorationRecordSummary({
  record,
}: {
  record: SiteExplorationRecord
}) {
  const [previewImage, setPreviewImage] = useState<SiteExplorationImage | null>(null)
  const sections = createSummarySections(record)

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section, index) => (
        <Fragment key={section.title}>
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold">{section.title}</h4>
            <SummaryRows
              section={section}
              record={record}
              onPreviewImage={setPreviewImage}
            />
          </section>
          {index < sections.length - 1 ? <Separator /> : null}
        </Fragment>
      ))}

      <Dialog open={previewImage !== null} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.originalName ?? '勘探图片'}</DialogTitle>
          </DialogHeader>
          {previewImage ? (
            <img
              src={previewImage.url}
              alt={previewImage.originalName}
              className="max-h-[70dvh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryRows({
  section,
  record,
  onPreviewImage,
}: {
  section: SummarySection
  record: SiteExplorationRecord
  onPreviewImage: (image: SiteExplorationImage) => void
}) {
  return (
    <dl className="grid grid-cols-1 gap-y-4">
      {section.rows.map(([label, value, kind, imageGroups]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <SummaryValue kind={kind} value={value} record={record} />
          <SummaryImages imageGroups={imageGroups} onPreviewImage={onPreviewImage} />
        </div>
      ))}
    </dl>
  )
}

function SummaryImages({
  imageGroups,
  onPreviewImage,
}: {
  imageGroups: readonly SummaryImageGroup[] | undefined
  onPreviewImage: (image: SiteExplorationImage) => void
}) {
  if (!imageGroups?.length) return null
  return (
    <div className="mt-2 flex flex-col gap-2">
      {imageGroups.map((group) => (
        <figure key={group.label} className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-2">
            {group.images.map((image) => (
              <Button
                key={image.objectKey}
                type="button"
                variant="outline"
                className="aspect-video h-auto w-full overflow-hidden p-0"
                aria-label={`查看${image.originalName}`}
                onClick={() => onPreviewImage(image)}
              >
                <img
                  src={image.url}
                  alt={image.originalName}
                  className="size-full object-cover"
                />
              </Button>
            ))}
          </div>
          <figcaption className="text-xs text-muted-foreground">{group.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function SummaryValue({
  kind,
  value,
  record,
}: {
  kind: SummaryRowKind | undefined
  value: string
  record: SiteExplorationRecord
}) {
  if (kind === 'arterial-road') {
    return (
      <dd className="mt-1">
        {value ? <p className="whitespace-pre-wrap break-words font-medium">{value}</p> : null}
        {record.arterialRoadTrafficGeoJson ? (
          <div className={value ? 'mt-3' : undefined}>
            <SiteExplorationArterialRoadSummary
              trafficGeoJson={record.arterialRoadTrafficGeoJson}
              compact
            />
          </div>
        ) : null}
      </dd>
    )
  }
  if (kind === 'nearby-stations') {
    if (record.nearbyTruckChargingStations.length === 0) return null
    return (
      <dd className="mt-2">
        <ol className="divide-y rounded-lg border bg-muted/20 px-3">
          {record.nearbyTruckChargingStations.map((station) => (
            <li key={station.sequence} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5"><SiteExplorationChargingStationIcon /></span>
              <span className="flex min-w-0 flex-col gap-0.5 break-words">
                <span className="block font-medium">{station.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatNearbyPlaceDistance(record, station)}
                </span>
                {formatNearbyStationSurvey(station) ? (
                  <span className="block whitespace-pre-wrap text-xs text-muted-foreground">
                    {formatNearbyStationSurvey(station)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </dd>
    )
  }
  if (kind === 'nearby-hotspots') {
    if (record.nearbyHotspotAreas.length === 0) return null
    return (
      <dd className="mt-2">
        <ol className="divide-y rounded-lg border bg-muted/20 px-3">
          {record.nearbyHotspotAreas.map((hotspot) => (
            <li key={hotspot.sequence} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5"><SiteExplorationHotspotIcon category={hotspot.category} /></span>
              <span className="flex min-w-0 flex-col gap-0.5 break-words">
                <span className="block font-medium">{hotspot.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {[hotspot.category, formatNearbyPlaceDistance(record, hotspot)].filter(Boolean).join(' · ')}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </dd>
    )
  }
  if (!value) return null
  return <dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd>
}

function formatNearbyStationSurvey(station: SiteExplorationRecord['nearbyTruckChargingStations'][number]): string {
  return [
    station.surveyScale.trim() ? `规模：${station.surveyScale.trim()}` : '',
    station.surveyModelQuantity.trim() ? `型号/数量：${station.surveyModelQuantity.trim()}` : '',
    station.surveyUtilizationRate ? `使用率：${station.surveyUtilizationRate}` : '',
    station.surveyElectricityPrice.trim() ? `电费：${station.surveyElectricityPrice.trim()}` : '',
  ].filter(Boolean).join('；')
}

function createSummarySections(record: SiteExplorationRecord): SummarySection[] {
  const perimeterMeters = record.siteBoundaryGeoJson
    ? calculatePolygonPerimeterMeters(record.siteBoundaryGeoJson.geometry.coordinates)
    : 0
  const contact = [record.contactName.trim(), record.contactPhone.trim()].filter(Boolean).join(' · ')
  const landType = record.landType
    ? `${optionLabel(explorationOptions.landType, record.landType)}${record.landTypeDescription.trim() ? `：${record.landTypeDescription.trim()}` : ''}`
    : ''
  const nearbyStations = record.nearbyTruckChargingStations
    .map((station) => `${station.sequence}. ${station.name}`)
    .join('\n')
  const nearbyHotspots = record.nearbyHotspotAreas
    .map((hotspot) => `${hotspot.sequence}. ${hotspot.name}（${hotspot.category}）`)
    .join('\n')
  const highwayRoutes = record.highwayRoutes
    .map((route, index) => `${index + 1}. ${route.name}（驾车 ${formatDistance(route.drivingDistanceMeters)}）`)
    .join('\n')

  return [
    {
      title: '位置与场站',
      rows: compactRows([
        ['位置', record.locationAddress.trim(), undefined, imageGroups(
          { label: '位置地图截图', images: record.locationSnapshot ? [record.locationSnapshot] : [] },
        )],
        ['省辖市', record.provinceCity.trim()],
        ['所在县（区）', record.countyDistrict.trim()],
        ['中心坐标', validCoordinate(record.longitude, record.latitude) ? `${record.longitude.toFixed(6)}, ${record.latitude.toFixed(6)}` : ''],
        ['场站联系人', contact],
        ['场站面积', record.siteAreaSquareMeters > 0 ? `${formatMu(record.siteAreaSquareMeters)} 亩（${record.siteAreaSquareMeters.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 平方米）` : '', undefined, imageGroups(
          { label: '边界测绘截图', images: record.siteBoundarySnapshot ? [record.siteBoundarySnapshot] : [] },
          { label: '场站卫星图', images: record.satelliteImages },
        )],
        ['周长', perimeterMeters > 0 ? formatDistance(perimeterMeters) : ''],
      ]),
    },
    {
      title: '交通与区位',
      rows: compactRows([
        ['高速出入口', highwayRoutes || record.highwayEntrance?.name || ''],
        ['距离高速口', formatHighwayDistance(record.highwayDistanceMeters, record.highwayDistanceGeoJson, record.highwayDistanceSnapshot), undefined, imageGroups(
          { label: '高速口测距截图', images: record.highwayDistanceSnapshot ? [record.highwayDistanceSnapshot] : [] },
        )],
        ['场站离国/省/主干道通道距离与车流', record.arterialRoadDistanceMeters > 0 ? formatDistance(record.arterialRoadDistanceMeters) : '', 'arterial-road', imageGroups(
          { label: '主干道距离与车流截图', images: record.arterialRoadDistanceSnapshot ? [record.arterialRoadDistanceSnapshot] : [] },
        )],
        ['进出便利性', record.accessConvenience ? optionLabel(explorationOptions.accessConvenience, record.accessConvenience) : '', undefined, imageGroups(
          { label: '进出便利性现场图', images: record.accessConvenienceImages },
        )],
      ]),
    },
    {
      title: '土地与建设',
      rows: compactRows([
        ['土地性质满足建设要求', yesNo(record.landQualified)],
        ['站点土地性质', record.landQualified ? landType : ''],
        ['土地证明材料', record.landQualified ? yesNo(record.hasLandProof) : ''],
        ['土地租赁协议', record.landQualified ? yesNo(record.hasLeaseAgreement) : ''],
        ['现场土地情况', '', undefined, imageGroups(
          { label: '现场土地图片', images: record.landSceneImages },
        )],
        ['是否有其他附属物', yesNo(record.hasOtherStructures), undefined, imageGroups(
          { label: '其他附属物图片', images: record.otherStructureImages },
        )],
        ['地面硬化条件', record.groundHardening ? optionLabel(explorationOptions.groundHardening, record.groundHardening) : ''],
        ['土地地势情况', record.terrainCondition ? optionLabel(explorationOptions.terrainCondition, record.terrainCondition) : ''],
      ]),
    },
    {
      title: '配套与评估',
      rows: compactRows([
        ['容量情况', record.capacityDescription.trim()],
        ['附近重卡充电站', nearbyStations, 'nearby-stations', imageGroups(
          { label: '附近重卡充电站地图', images: record.nearbyTruckChargingStationSnapshot ? [record.nearbyTruckChargingStationSnapshot] : [] },
        )],
        ['5 公里内热点区域', nearbyHotspots, 'nearby-hotspots', imageGroups(
          { label: '周边热点区域地图', images: record.nearbyHotspotAreaSnapshot ? [record.nearbyHotspotAreaSnapshot] : [] },
        )],
        ['合作模式', record.cooperationMode ? optionLabel(explorationOptions.cooperationMode, record.cooperationMode) : ''],
        ['合作条件', record.cooperationTerms.trim()],
        ['场站成熟度', record.siteMaturity ? optionLabel(explorationOptions.siteMaturity, record.siteMaturity) : ''],
        ['其他重要事项', record.importantNotes.trim()],
      ]),
    },
    {
      title: '勘探信息',
      rows: compactRows([
        ['勘探小组', record.explorationTeam.trim()],
        ['勘探日期', record.explorationDate.trim()],
        ['创建人', record.createdByMemberName.trim()],
        ['最近修改人', record.updatedByMemberName.trim()],
        ['最后修改时间', formatDateTime(record.updatedAt)],
      ]),
    },
  ].filter((section) => section.rows.length > 0)
}

function imageGroups(...groups: SummaryImageGroup[]): SummaryImageGroup[] {
  return groups.filter((group) => group.images.length > 0)
}

function compactRows(rows: SummaryRow[]): SummaryRow[] {
  return rows.filter(([, value, , groups]) => value.length > 0 || Boolean(groups?.length))
}

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function yesNo(value: boolean): string {
  return value ? '是' : '否'
}

function validCoordinate(longitude: number, latitude: number): boolean {
  return Number.isFinite(longitude) && Number.isFinite(latitude) && longitude !== 0 && latitude !== 0
}

function formatMu(squareMeters: number): string {
  return (squareMeters / 666.666_666_7).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatDistance(meters: number): string {
  return meters >= 1_000
    ? `${(meters / 1_000).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 公里`
    : `${meters.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 米`
}

const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatDateTime(timestamp: number): string {
  return dateTimeFormat.format(new Date(timestamp * 1_000))
}
