import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { deleteSiteExplorationSite, getSiteExplorationSite, siteExplorationErrorMessage, type SiteExplorationRecord } from './site-exploration-api'
import { explorationOptions } from './site-exploration-fields'
import { formatHighwayDistance } from './site-exploration-highway-distance'
import { ErrorCard, SiteExplorationDetailSkeleton } from './site-exploration-edit-page'
import { SiteExplorationStatusBadge } from './site-exploration-status-badge'
import { getSiteSelectionRecommendationBand } from './site-selection-recommendation-config'
import { SiteExplorationSourceAttachments } from './site-exploration-source-attachments'
import { SiteExplorationWordDownloadButton } from './site-exploration-word-download-button'
import { SiteExplorationMoreActions } from './site-exploration-record-header'

export function SiteExplorationDetailPage({ siteId }: { siteId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const site = useQuery({ queryKey: ['site-exploration', 'detail', siteId], queryFn: () => getSiteExplorationSite(siteId), retry: false })
  const deletion = useMutation({ mutationFn: () => deleteSiteExplorationSite(siteId) })
  if (site.isPending) return <SiteExplorationDetailSkeleton />
  if (site.isError) return <ErrorCard error={site.error} onRetry={() => void site.refetch()} />
  const record = site.data

  async function remove() {
    try {
      await deletion.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] })
      toast.success('勘探站点已删除')
      await navigate({ to: '/site-exploration' })
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
    }
  }

  return <section className="flex flex-col gap-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-col gap-2"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{record.projectName}</h1><SiteExplorationStatusBadge status={record.status} /></div><p className="text-sm text-muted-foreground">{record.provinceCity} · {record.countyDistrict} · {record.locationAddress}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" render={<Link to="/site-exploration" />}>返回列表</Button><SiteExplorationWordDownloadButton siteId={siteId} /><Button render={<Link to="/site-exploration/$siteId/edit" params={{ siteId }} />}>编辑</Button><SiteExplorationMoreActions showSetDraft={false} statusPending={false} deletionPending={deletion.isPending} onDelete={() => void remove()} /></div></header><DetailSections record={record} /></section>
}

function DetailSections({ record }: { record: SiteExplorationRecord }) {
  return <div className="grid gap-6"><DetailCard title="流程与基本信息" rows={[
    ['勘探人', record.explorerName], ['勘探小组', record.explorationTeam], ['勘探日期', record.explorationDate], ['综合得分', String(record.overallScore)], ['选址建议', record.selectionRecommendation === '' ? '未评估' : getSiteSelectionRecommendationBand(record.overallScore).label],
  ]} /><DetailCard title="基础与位置" rows={[
    ['场站联系人', record.contactName], ['联系电话', record.contactPhone], ['省辖市', record.provinceCity], ['所在县（区）', record.countyDistrict], ['详细位置', record.locationAddress], ['经纬度', `${record.longitude}, ${record.latitude}`], ['高速出入口', record.highwayRoutes.length > 0 ? record.highwayRoutes.map((route, index) => `${index + 1}. ${route.name}（驾车 ${route.drivingDistanceMeters < 1000 ? `${route.drivingDistanceMeters} 米` : `${(route.drivingDistanceMeters / 1000).toFixed(1)} 公里`}）`).join('\n') : record.highwayEntrance?.name ?? ''], ['距离高速口', formatHighwayDistance(record.highwayDistanceMeters, record.highwayDistanceGeoJson, record.highwayDistanceSnapshot)], ['场站面积', `${record.siteAreaSquareMeters} 平方米`], ['离国/省/主干道通道', `${record.arterialRoadDistanceMeters} 米`], ['进出便利性', label(explorationOptions.accessConvenience, record.accessConvenience)],
  ]} /><DetailCard title="土地与建设条件" rows={[
    ['土地性质满足建设要求', yesNo(record.landQualified)], ['土地性质', record.landQualified ? `${label(explorationOptions.landType, record.landType)}${record.landTypeDescription ? `：${record.landTypeDescription}` : ''}` : '不适用'], ['土地证明材料', yesNo(record.hasLandProof)], ['土地租赁协议', yesNo(record.hasLeaseAgreement)], ['其他附属物', yesNo(record.hasOtherStructures)], ['地面硬化条件', label(explorationOptions.groundHardening, record.groundHardening)], ['土地地势', label(explorationOptions.terrainCondition, record.terrainCondition)],
  ]} /><DetailCard title="容量与合作" rows={[
    ['容量情况', record.capacityDescription], ['5 公里内新能源重卡充电站', formatNearbyStations(record)], ['5 公里内热点区域', record.nearbyHotspotAreas.map(({ sequence, name, category }) => `${sequence}. ${name}（${category}）`).join('\n')], ['合作模式', label(explorationOptions.cooperationMode, record.cooperationMode)], ['合作条件', record.cooperationTerms], ['场站成熟度', label(explorationOptions.siteMaturity, record.siteMaturity)], ['其他重要事项', record.importantNotes],
  ]} /><ImageCard record={record} /><SiteExplorationSourceAttachments record={record} /></div>
}

function DetailCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([name, value]) => <div key={name} className="min-w-0"><dt className="text-sm text-muted-foreground">{name}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{value || '—'}</dd></div>)}</CardContent></Card>
}

function ImageCard({ record }: { record: SiteExplorationRecord }) {
  const groups = [['场站位置卫星图', record.satelliteImages], ['附近重卡充电站地图', record.nearbyTruckChargingStationSnapshot ? [record.nearbyTruckChargingStationSnapshot] : []], ['周边热点区域地图', record.nearbyHotspotAreaSnapshot ? [record.nearbyHotspotAreaSnapshot] : []], ['进出便利性现场图', record.accessConvenienceImages], ['现场土地情况', record.landSceneImages], ['其他附属物', record.otherStructureImages]] as const
  return <Card><CardHeader><CardTitle>现场图片</CardTitle></CardHeader><CardContent className="grid gap-6 lg:grid-cols-2">{groups.map(([name, images]) => <section key={name}><h3 className="mb-3 text-sm font-medium">{name}（{images.length}）</h3>{images.length ? <div className="grid grid-cols-3 gap-3">{images.map((image) => <a key={image.objectKey} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.originalName} className="aspect-square w-full rounded-lg border object-cover" /></a>)}</div> : <p className="text-sm text-muted-foreground">未上传</p>}</section>)}</CardContent></Card>
}

function label(options: readonly { value: string; label: string }[], value: string): string { return options.find((option) => option.value === value)?.label ?? value }
function yesNo(value: boolean): string { return value ? '是' : '否' }
function formatNearbyStations(record: SiteExplorationRecord): string {
  return record.nearbyTruckChargingStations.map((station) => {
    const survey = [
      station.surveyScale.trim() ? `规模：${station.surveyScale.trim()}` : '',
      station.surveyModelQuantity.trim() ? `型号/数量：${station.surveyModelQuantity.trim()}` : '',
      station.surveyUtilizationRate ? `使用率：${station.surveyUtilizationRate}` : '',
      station.surveyElectricityPrice.trim() ? `电费：${station.surveyElectricityPrice.trim()}` : '',
    ].filter(Boolean).join('；')
    return `${station.sequence}. ${station.name}${survey ? `\n${survey}` : ''}`
  }).join('\n')
}
