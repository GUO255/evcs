import { useMemo, useState } from 'react'
import { CameraIcon, SearchIcon } from '@/components/ui/icons'

import { ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import {
  getStationStatusLabel,
  type ChargingStation,
  type StationStatus,
} from '@/features/charging-stations/station-data'
import { StationVideoMonitoring } from '@/features/charging-stations/station-video-monitoring'
import { useStations } from '@/features/charging-stations/station-store'

export function VideoMonitoringPage() {
  const { stations } = useStations()
  const [query, setQuery] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState<string>()
  const [selectedStationId, setSelectedStationId] = useState<string>()
  const [searchError, setSearchError] = useState('')
  const searchResults = useMemo(
    () => submittedKeyword === undefined ? [] : searchStations(stations, submittedKeyword),
    [stations, submittedKeyword],
  )
  const selectedStation = selectedStationId
    ? stations.find((station) => station.id === selectedStationId)
    : undefined

  function submitSearch(keyword: string) {
    setQuery(keyword)
    if (!keyword) {
      setSearchError('请输入站点名称或编号')
      setSubmittedKeyword(undefined)
      setSelectedStationId(undefined)
      return
    }
    setSearchError('')
    setSubmittedKeyword(keyword)
    setSelectedStationId(undefined)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">视频监控</h1>
        <p className="text-sm text-muted-foreground">先搜索并选择充电站，再加载该站点的视频监控列表。</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>搜索站点</CardTitle>
          <CardDescription>支持按站点名称、编号、城市或地址搜索。</CardDescription>
        </CardHeader>
        <CardContent>
          <ListFilters>
            <ListFilterRow label="搜索">
              <div className="flex w-full flex-col gap-1">
                <ListSearchField
                  value={query}
                  onInputChange={() => {
                    if (searchError) setSearchError('')
                  }}
                  onValueChange={submitSearch}
                  placeholder="输入站点名称或编号"
                  ariaLabel="搜索站点"
                />
                {searchError ? <p className="text-sm text-destructive">{searchError}</p> : null}
              </div>
            </ListFilterRow>
          </ListFilters>
        </CardContent>
      </Card>

      {selectedStation ? (
        <SelectedStationMonitoring
          station={selectedStation}
          onReselect={() => setSelectedStationId(undefined)}
        />
      ) : (
        <StationSearchState
          submittedKeyword={submittedKeyword}
          stations={searchResults}
          onSelect={setSelectedStationId}
        />
      )}
    </section>
  )
}

interface StationSearchStateProps {
  submittedKeyword?: string
  stations: readonly ChargingStation[]
  onSelect: (stationId: string) => void
}

function StationSearchState({ submittedKeyword, stations, onSelect }: StationSearchStateProps) {
  const pagination = useTablePagination(stations, submittedKeyword ?? '')

  if (submittedKeyword === undefined) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
          <EmptyTitle>请先搜索站点</EmptyTitle>
          <EmptyDescription>监控列表将在选择站点后加载。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (stations.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchIcon /></EmptyMedia>
          <EmptyTitle>未找到匹配站点</EmptyTitle>
          <EmptyDescription>没有与“{submittedKeyword}”匹配的站点，请更换关键词后重试。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>站点搜索结果</CardTitle>
        <CardDescription>找到 {stations.length} 个站点，请选择需要查看的站点。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>站点编号</TableHead>
                <TableHead>站点名称</TableHead>
                <TableHead>运营状态</TableHead>
                <TableHead>所在地区</TableHead>
                <TableHead>监控数量</TableHead>
                <TableHead><span className="sr-only">操作</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map((station) => (
                <TableRow key={station.id}>
                  <TableCell className="font-medium">{station.code}</TableCell>
                  <TableCell>{station.name}</TableCell>
                  <TableCell><StationStatusBadge status={station.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{station.city} {station.district}</TableCell>
                  <TableCell>{station.cameras.length} 路</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => onSelect(station.id)}>
                      <CameraIcon data-icon="inline-start" />
                      加载监控
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination total={stations.length} unit="个站点" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}

function SelectedStationMonitoring({ station, onReselect }: {
  station: ChargingStation
  onReselect: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{station.name}</CardTitle>
          <CardDescription>{station.code} · {station.province} {station.city} {station.district} {station.address}</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={onReselect}>重新选择站点</Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <StationStatusBadge status={station.status} />
          <Badge variant="outline">{station.cameras.length} 路监控</Badge>
        </CardContent>
      </Card>
      <StationVideoMonitoring key={station.id} station={station} />
    </div>
  )
}

function StationStatusBadge({ status }: { status: StationStatus }) {
  const variant = status === 'operating' ? 'default' : status === 'maintenance' ? 'secondary' : 'outline'
  return <Badge variant={variant}>{getStationStatusLabel(status)}</Badge>
}

export function searchStations(
  stations: readonly ChargingStation[],
  keyword: string,
): ChargingStation[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN')
  if (!normalizedKeyword) return []
  return stations.filter((station) => (
    [station.code, station.name, station.city, station.address]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedKeyword))
  ))
}
