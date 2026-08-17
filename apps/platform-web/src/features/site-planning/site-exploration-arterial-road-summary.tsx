import { Badge } from '@/components/ui/badge'

import type { ArterialRoadTrafficGeoJson } from './site-exploration-api'

export function SiteExplorationArterialRoadSummary({
  trafficGeoJson,
  compact = false,
}: {
  trafficGeoJson: ArterialRoadTrafficGeoJson
  compact?: boolean
}) {
  const properties = trafficGeoJson.properties
  const roadRef = savedString(properties.ref)
  const roadName = savedString(properties.name)
  const roadLabel = [roadRef, roadName].filter(Boolean).join(' · ') || '—'
  const roadLevel = savedRoadLevel(properties.roadLevel)
  const automaticDistanceMeters = savedNumber(properties.automaticDistanceMeters)
  const visitCount = savedNumber(properties.visitCount)
  const uniqueVehicleCount = savedNumber(properties.uniqueVehicleCount)

  return (
    <div
      className={compact ? 'grid gap-4' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'}
      aria-label="已保存的主干道与车流分析结果"
    >
      <SavedAnalysisItem label="最近道路" value={roadLabel} badge={roadLevel} compact={compact} />
      <SavedAnalysisItem
        label="自动直线距离"
        value={automaticDistanceMeters === null ? '—' : formatSavedDistance(automaticDistanceMeters)}
        compact={compact}
      />
      <SavedAnalysisItem
        label="车辆数"
        value={visitCount === null ? '—' : `${visitCount.toLocaleString('zh-CN')} 辆次`}
        compact={compact}
      />
      <SavedAnalysisItem
        label="去重车辆数"
        value={uniqueVehicleCount === null ? '—' : `${uniqueVehicleCount.toLocaleString('zh-CN')} 辆`}
        compact={compact}
      />
    </div>
  )
}

function SavedAnalysisItem({
  label,
  value,
  badge,
  compact,
}: {
  label: string
  value: string
  badge?: string
  compact: boolean
}) {
  return (
    <div className={compact ? 'min-w-0' : 'rounded-lg border bg-muted/20 px-3 py-2.5'}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium tabular-nums" title={value}>{value}</p>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>
    </div>
  )
}

function savedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function savedNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function savedRoadLevel(value: unknown): string | undefined {
  return value === 'national' ? '国道' : value === 'provincial' ? '省道' : undefined
}

function formatSavedDistance(distanceMeters: number): string {
  return distanceMeters < 1_000
    ? `${Math.round(distanceMeters).toLocaleString('zh-CN')} 米`
    : `${(distanceMeters / 1_000).toFixed(2)} 公里`
}
