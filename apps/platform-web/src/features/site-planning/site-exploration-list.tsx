import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'

import { ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { CursorTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { DownloadIcon, ImageIcon, LoaderCircleIcon, Trash2Icon, UsersIcon } from '@/components/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  siteExplorationStatusOptions,
  type SiteExplorationStatus,
  type SiteSelectionRecommendation,
} from './site-exploration-data'
import {
  deleteSiteExplorationSites,
  exportSiteExplorationSites,
  listSiteExplorationFilterOptions,
  listSiteExplorationSites,
  SiteExplorationApiError,
  siteExplorationErrorMessage,
  type SiteExplorationImage,
  type SiteExplorationListItem,
} from './site-exploration-api'
import { SiteExplorationStatusBadge } from './site-exploration-status-badge'
import { getSiteSelectionRecommendationBand } from './site-selection-recommendation-config'
import {
  formatSiteExplorationArea,
  formatSiteExplorationDistance,
  formatSiteExplorationTraffic,
  formatSiteExplorationUniqueTraffic,
} from './site-exploration-metric-format'

const PAGE_SIZE = 20
const FILTER_STORAGE_KEY = 'evcs.site-exploration.list-filters.v1'
const EMPTY_SITE_EXPLORATION_ITEMS: SiteExplorationListItem[] = []

type SiteExplorationListFilters = {
  status: 'all' | SiteExplorationStatus
  team: string
  explorer: string
  city: string
  route: string
  projectPrefix: string
}

const DEFAULT_FILTERS: SiteExplorationListFilters = {
  status: 'all',
  team: '',
  explorer: 'all',
  city: 'all',
  route: 'all',
  projectPrefix: '',
}

export function SiteExplorationList({
  title,
  description,
  onScopeTeamNameChange,
  onTeamAssignmentRequiredChange,
}: {
  title?: string
  description?: string
  onScopeTeamNameChange?: (teamName: string | null) => void
  onTeamAssignmentRequiredChange?: (required: boolean) => void
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [initialFilters] = useState(() => readStoredFilters(window.sessionStorage))
  const [status, setStatus] = useState<'all' | SiteExplorationStatus>(initialFilters.status)
  const [team, setTeam] = useState(initialFilters.team)
  const [explorer, setExplorer] = useState(initialFilters.explorer)
  const [city, setCity] = useState(initialFilters.city)
  const [route, setRoute] = useState(initialFilters.route)
  const [projectPrefix, setProjectPrefix] = useState(initialFilters.projectPrefix)
  const [preview, setPreview] = useState<{ image: SiteExplorationImage; title: string } | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cursorState, setCursorState] = useState<{ key: string; pageIndex: number; cursors: (string | undefined)[] }>({
    key: '',
    pageIndex: 0,
    cursors: [undefined],
  })
  const deferredTeam = useDeferredValue(team.trim())
  const deferredProjectPrefix = useDeferredValue(projectPrefix.trim())
  const filterKey = [status, deferredTeam, explorer, city, route, deferredProjectPrefix].join('\u0000')
  const activeCursorState = cursorState.key === filterKey
    ? cursorState
    : { key: filterKey, pageIndex: 0, cursors: [undefined] }
  const cursor = activeCursorState.cursors[activeCursorState.pageIndex]
  const sites = useQuery({
    queryKey: ['site-exploration', 'list', filterKey, cursor],
    queryFn: () => listSiteExplorationSites({
      limit: PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
      ...(status === 'all' ? {} : { status }),
      ...(deferredTeam ? { team: deferredTeam } : {}),
      ...(explorer === 'all' ? {} : { explorer }),
      ...(city === 'all' ? {} : { city }),
      ...(route === 'all' ? {} : { route }),
      ...(deferredProjectPrefix ? { projectPrefix: deferredProjectPrefix } : {}),
    }),
    staleTime: 30_000,
    retry: false,
  })
  const deleteMutation = useMutation({ mutationFn: deleteSiteExplorationSites })
  const exportMutation = useMutation({ mutationFn: exportSiteExplorationSites })
  const filterOptions = useQuery({
    queryKey: ['site-exploration', 'filter-options', filterKey],
    queryFn: () => listSiteExplorationFilterOptions({
      ...(status === 'all' ? {} : { status }),
      ...(deferredTeam ? { team: deferredTeam } : {}),
      ...(explorer === 'all' ? {} : { explorer }),
      ...(city === 'all' ? {} : { city }),
      ...(route === 'all' ? {} : { route }),
      ...(deferredProjectPrefix ? { projectPrefix: deferredProjectPrefix } : {}),
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  })
  const scopeTeamName = filterOptions.data?.scopeTeamName
  useEffect(() => {
    if (scopeTeamName !== undefined) onScopeTeamNameChange?.(scopeTeamName)
  }, [onScopeTeamNameChange, scopeTeamName])
  const teamAssignmentRequired = (
    filterOptions.error instanceof SiteExplorationApiError
    && filterOptions.error.code === 'exploration_site_access_denied'
  ) || (
    sites.error instanceof SiteExplorationApiError
    && sites.error.code === 'exploration_site_access_denied'
  )
  useEffect(() => {
    onTeamAssignmentRequiredChange?.(teamAssignmentRequired)
  }, [onTeamAssignmentRequiredChange, teamAssignmentRequired])
  const filteredSiteTotal = filterOptions.data && !filterOptions.isPlaceholderData
    ? status === 'all'
      ? filterOptions.data.statuses.total
      : filterOptions.data.statuses.options.find((option) => option.value === status)?.count ?? 0
    : null

  const columns = useMemo<ColumnDef<SiteExplorationListItem>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          aria-label="选择当前页全部勘探站点"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          disabled={sites.isPending || deleteMutation.isPending}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`选择勘探站点 ${row.original.projectName || '未命名勘探站点'}`}
          checked={row.getIsSelected()}
          disabled={deleteMutation.isPending}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      ),
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="block max-w-40 truncate font-mono text-xs" title={row.original.id}>
          {row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'explorationDate',
      header: '勘探日期',
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.explorationDate}</span>,
    },
    {
      accessorKey: 'projectName',
      header: '项目名称',
      cell: ({ row }) => {
        const projectName = row.original.projectName || '未命名勘探站点'
        const preview = row.original.siteBoundarySnapshot
          ?? row.original.satelliteImagePreview
          ?? row.original.locationSnapshot
        const previewName = row.original.siteBoundarySnapshot
          ? '测绘图片'
          : row.original.satelliteImagePreview
            ? '卫星图'
            : '定位图片'
        return (
          <div className="flex min-w-72 items-center gap-3">
            {preview ? (
              <Button
                type="button"
                variant="outline"
                className="h-16 w-24 shrink-0 overflow-hidden p-0"
                aria-label={`查看${projectName}${previewName}大图`}
                onClick={(event) => {
                  event.stopPropagation()
                  setPreview({ image: preview, title: `${projectName} · ${previewName}` })
                }}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <img
                  src={preview.url}
                  alt={`${projectName}${previewName}`}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </Button>
            ) : (
              <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground" aria-label="暂无站点图片">
                <ImageIcon className="size-5" aria-hidden="true" />
              </span>
            )}
            <span className="block max-w-64 truncate font-medium" title={projectName}>{projectName}</span>
          </div>
        )
      },
    },
    { accessorKey: 'provinceCity', header: '省辖市' },
    { accessorKey: 'countyDistrict', header: '所在县（区）' },
    {
      accessorKey: 'highwayDistanceMeters',
      header: '高速距离',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatSiteExplorationDistance(row.original.highwayDistanceMeters)}
        </span>
      ),
    },
    {
      accessorKey: 'arterialRoadDistanceMeters',
      header: '主干通道距离',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatSiteExplorationDistance(row.original.arterialRoadDistanceMeters)}
        </span>
      ),
    },
    {
      accessorKey: 'nearestRoadName',
      header: '最近道路',
      cell: ({ row }) => (
        <span className="block max-w-40 truncate whitespace-nowrap" title={row.original.nearestRoadName ?? undefined}>
          {row.original.nearestRoadName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'siteAreaSquareMeters',
      header: '场站面积',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatSiteExplorationArea(row.original.siteAreaSquareMeters)}
        </span>
      ),
    },
    {
      accessorKey: 'trafficVisitCount',
      header: '车流量',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatSiteExplorationTraffic(row.original.trafficVisitCount)}
        </span>
      ),
    },
    {
      accessorKey: 'uniqueTrafficVehicleCount',
      header: '去重车流',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatSiteExplorationUniqueTraffic(row.original.uniqueTrafficVehicleCount)}
        </span>
      ),
    },
    {
      accessorKey: 'nearbyChargingStationCount',
      header: '周边充电站',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.nearbyChargingStationCount} 个
        </span>
      ),
    },
    {
      accessorKey: 'nearbyHotspotAreaCount',
      header: '周边热点区域',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.nearbyHotspotAreaCount} 个
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const item = row.original
        const contractStage = ['signed', 'under-construction', 'operating'].includes(item.status)
        return (
          <SiteExplorationStatusBadge
            status={item.status}
            completed={contractStage ? item.contractCompletionCompleted : item.completionCompleted}
            total={contractStage ? item.contractCompletionTotal : item.completionTotal}
          />
        )
      },
    },
    { accessorKey: 'explorerName', header: '勘探人' },
    { accessorKey: 'explorationTeam', header: '勘探小组' },
    {
      accessorKey: 'updatedAt',
      header: '最近修改时间',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatTimestamp(row.original.updatedAt)}
        </span>
      ),
    },
    {
      accessorKey: 'overallScore',
      header: '综合得分',
      cell: ({ row }) => <Badge variant="secondary" className="tabular-nums">{row.original.overallScore}</Badge>,
    },
    {
      accessorKey: 'selectionRecommendation',
      header: '选址建议',
      cell: ({ row }) => row.original.selectionRecommendation
        ? <SiteSelectionRecommendationBadge recommendation={row.original.selectionRecommendation} score={row.original.overallScore} />
        : <span className="text-muted-foreground">—</span>,
    },
  ], [deleteMutation.isPending, sites.isPending])
  const table = useReactTable({
    data: sites.data?.items ?? EMPTY_SITE_EXPLORATION_ITEMS,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  })
  const selectedIds = Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id)

  useEffect(() => {
    writeStoredFilters(window.sessionStorage, { status, team, explorer, city, route, projectPrefix })
  }, [city, explorer, projectPrefix, route, status, team])

  function clearRowSelection() {
    setRowSelection((current) => Object.keys(current).length > 0 ? {} : current)
  }

  function changeStatus(nextStatus: 'all' | SiteExplorationStatus) {
    clearRowSelection()
    setStatus(nextStatus)
  }

  function changeTeam(nextTeam: string) {
    clearRowSelection()
    setTeam(nextTeam === 'all' ? '' : nextTeam)
  }

  function changeExplorer(nextExplorer: string) {
    clearRowSelection()
    setExplorer(nextExplorer)
  }

  function changeCity(nextCity: string) {
    clearRowSelection()
    setCity(nextCity)
  }

  function changeRoute(nextRoute: string) {
    clearRowSelection()
    setRoute(nextRoute)
  }

  function changeProjectPrefix(nextProjectPrefix: string) {
    clearRowSelection()
    setProjectPrefix(nextProjectPrefix)
  }

  async function deleteSelectedSites() {
    try {
      const deletedCount = await deleteMutation.mutateAsync(selectedIds)
      selectedIds.forEach((id) => queryClient.removeQueries({ queryKey: ['site-exploration', 'detail', id] }))
      if (deletedCount === (sites.data?.items.length ?? 0) && activeCursorState.pageIndex > 0) {
        setCursorState({ ...activeCursorState, pageIndex: activeCursorState.pageIndex - 1 })
      }
      setRowSelection({})
      setDeleteDialogOpen(false)
      toast.success(`已删除 ${deletedCount} 个勘探站点`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'filter-options'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'daily-records'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'daily-attachments'] }),
      ])
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点批量删除失败，请稍后重试。')
    }
  }

  async function exportFilteredSites() {
    if (exportMutation.isPending) return
    try {
      const exported = await exportMutation.mutateAsync({
        ...(status === 'all' ? {} : { status }),
        ...(deferredTeam ? { team: deferredTeam } : {}),
        ...(explorer === 'all' ? {} : { explorer }),
        ...(city === 'all' ? {} : { city }),
        ...(route === 'all' ? {} : { route }),
        ...(deferredProjectPrefix ? { projectPrefix: deferredProjectPrefix } : {}),
      })
      const url = URL.createObjectURL(exported.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exported.fileName
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      toast.success('勘探站点 Excel 已导出')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点导出失败，请稍后重试。')
    }
  }

  function goNext() {
    const nextCursor = sites.data?.nextCursor
    if (!nextCursor) return
    clearRowSelection()
    setCursorState({
      key: filterKey,
      pageIndex: activeCursorState.pageIndex + 1,
      cursors: [...activeCursorState.cursors.slice(0, activeCursorState.pageIndex + 1), nextCursor],
    })
  }

  function goPrevious() {
    if (activeCursorState.pageIndex === 0) return
    clearRowSelection()
    setCursorState({ ...activeCursorState, pageIndex: activeCursorState.pageIndex - 1 })
  }

  if (teamAssignmentRequired) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Empty className="min-h-64 border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
              <EmptyTitle>需要设置勘探小组</EmptyTitle>
              <EmptyDescription>当前账号尚未加入可用的勘探小组，请联系管理员设置小组后再访问勘探站点。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
      <CardHeader className="gap-4">
        {title ? (
          <div className="flex flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        <ListFilters>
          <ListFilterRow label="状态">
            {filterOptions.isPending ? (
              <Skeleton className="h-8 w-full max-w-xl" aria-busy="true" />
            ) : filterOptions.isError ? (
              <FilterOptionsError error={filterOptions.error} fetching={filterOptions.isFetching} onRetry={() => void filterOptions.refetch()} />
            ) : (
              <ListFilterOptionGroup
                ariaLabel="按勘探状态筛选"
                options={[{ value: 'all', label: '全部' }, ...siteExplorationStatusOptions]}
                counts={Object.fromEntries([
                  ['all', filterOptions.data.statuses.total],
                  ...filterOptions.data.statuses.options.map((option) => [option.value, option.count]),
                ])}
                hideAllCount
                value={status}
                onValueChange={changeStatus}
              />
            )}
          </ListFilterRow>
          {filterOptions.data?.canFilterByTeam ? (
            <ListFilterRow label="勘探小组">
              <ListFilterOptionGroup
                ariaLabel="按勘探小组筛选"
                options={[
                  { value: 'all', label: '全部' },
                  ...filterOptions.data.teams.options.map((option) => ({ value: option.value, label: option.value })),
                ]}
                counts={Object.fromEntries([
                  ['all', filterOptions.data.teams.total],
                  ...filterOptions.data.teams.options.map((option) => [option.value, option.count]),
                ])}
                hideAllCount
                value={team || 'all'}
                onValueChange={changeTeam}
              />
            </ListFilterRow>
          ) : null}
          <ListFilterRow label="勘探人">
            {filterOptions.isPending ? (
              <Skeleton className="h-8 w-full max-w-xl" aria-busy="true" />
            ) : filterOptions.isError ? (
              <FilterOptionsError error={filterOptions.error} fetching={filterOptions.isFetching} onRetry={() => void filterOptions.refetch()} />
            ) : (
              <ListFilterOptionGroup
                ariaLabel="按勘探人筛选"
                options={[
                  { value: 'all', label: '全部' },
                  ...filterOptions.data.explorers.options.map((option) => ({ value: option.value, label: option.value })),
                ]}
                counts={Object.fromEntries([
                  ['all', filterOptions.data.explorers.total],
                  ...filterOptions.data.explorers.options.map((option) => [option.value, option.count]),
                ])}
                hideAllCount
                value={explorer}
                onValueChange={changeExplorer}
              />
            )}
          </ListFilterRow>
          <ListFilterRow label="省辖市">
            {filterOptions.isPending ? (
              <Skeleton className="h-8 w-full max-w-md" aria-busy="true" />
            ) : filterOptions.isError ? (
              <FilterOptionsError error={filterOptions.error} fetching={filterOptions.isFetching} onRetry={() => void filterOptions.refetch()} />
            ) : (
              <ListFilterOptionGroup
                ariaLabel="按省辖市筛选勘探站点"
                options={[
                  { value: 'all', label: '全部' },
                  ...filterOptions.data.cities.options.map((option) => ({ value: option.value, label: option.value })),
                ]}
                counts={Object.fromEntries([
                  ['all', filterOptions.data.cities.total],
                  ...filterOptions.data.cities.options.map((option) => [option.value, option.count]),
                ])}
                hideAllCount
                value={city}
                onValueChange={changeCity}
              />
            )}
          </ListFilterRow>
          <ListFilterRow label="路线">
            {filterOptions.isPending ? (
              <Skeleton className="h-8 w-full max-w-md" aria-busy="true" />
            ) : filterOptions.isError ? (
              <FilterOptionsError error={filterOptions.error} fetching={filterOptions.isFetching} onRetry={() => void filterOptions.refetch()} />
            ) : (
              <ListFilterOptionGroup
                ariaLabel="按路线筛选勘探站点"
                options={[
                  { value: 'all', label: '全部' },
                  ...filterOptions.data.routes.options.map((option) => ({ value: option.value, label: option.value })),
                ]}
                counts={Object.fromEntries([
                  ['all', filterOptions.data.routes.total],
                  ...filterOptions.data.routes.options.map((option) => [option.value, option.count]),
                ])}
                hideAllCount
                value={route}
                onValueChange={changeRoute}
              />
            )}
          </ListFilterRow>
          <ListFilterRow label="项目名称">
            <ListSearchField value={projectPrefix} onValueChange={changeProjectPrefix} placeholder="按项目前缀搜索" ariaLabel="按项目名称前缀搜索" />
          </ListFilterRow>
          <ListFilterRow label="操作">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={exportMutation.isPending || sites.isPending || filteredSiteTotal === 0}
                onClick={() => void exportFilteredSites()}
              >
                {exportMutation.isPending
                  ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  : <DownloadIcon data-icon="inline-start" />}
                <span>{exportMutation.isPending ? '正在导出' : '导出筛选结果'}</span>
                <span>（{filteredSiteTotal}）</span>
              </Button>
              {selectedIds.length > 0 ? (
                <>
                  <Badge variant="secondary">已选择 {selectedIds.length} 个站点</Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    删除
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => setRowSelection({})}
                  >
                    取消选择
                  </Button>
                </>
              ) : null}
            </div>
          </ListFilterRow>
        </ListFilters>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sites.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border py-12 text-center">
            <p className="text-sm text-destructive">
              {siteExplorationErrorMessage(sites.error) ?? '登录状态已失效，正在重新认证。'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void sites.refetch()}>重新加载</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {sites.isPending ? (
                  <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">正在加载勘探站点…</TableCell></TableRow>
                ) : table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    aria-label={`编辑${row.original.projectName || '未命名勘探站点'}`}
                    onClick={() => void navigate({ to: '/site-exploration/$siteId/edit', params: { siteId: row.original.id } })}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      void navigate({ to: '/site-exploration/$siteId/edit', params: { siteId: row.original.id } })
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={cell.column.id === 'select' ? (event) => event.stopPropagation() : undefined}
                        onKeyDown={cell.column.id === 'select' ? (event) => event.stopPropagation() : undefined}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">没有符合当前筛选条件的勘探站点</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <CursorTablePagination
          summary={filteredSiteTotal === null
            ? `第 ${activeCursorState.pageIndex + 1} 页`
            : `第 ${activeCursorState.pageIndex + 1} 页，共 ${filteredSiteTotal} 个站点`}
          previousDisabled={activeCursorState.pageIndex === 0 || sites.isFetching}
          nextDisabled={!sites.data?.nextCursor || sites.isFetching}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      </CardContent>
      </Card>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除已选择的勘探站点？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除 {selectedIds.length} 个勘探站点及其图片、附件和分析记录，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void deleteSelectedSites()}
            >
              {deleteMutation.isPending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.title ?? '站点图片'}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <img
              src={preview.image.url}
              alt={preview.title}
              className="max-h-[78dvh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FilterOptionsError({
  error,
  fetching,
  onRetry,
}: {
  error: Error
  fetching: boolean
  onRetry: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-destructive">
        {siteExplorationErrorMessage(error) ?? '认证状态已失效，正在重新认证。'}
      </span>
      <Button type="button" size="sm" variant="outline" disabled={fetching} onClick={onRetry}>
        {fetching ? '重新加载中' : '重新加载'}
      </Button>
    </div>
  )
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).format(new Date(value * 1000))
}

function SiteSelectionRecommendationBadge({ recommendation, score }: { recommendation: SiteSelectionRecommendation; score: number }) {
  if (recommendation === '') {
    return <Badge variant="outline">未评估</Badge>
  }
  const band = getSiteSelectionRecommendationBand(score)
  return <Badge variant="outline" className={band.badgeClassName}>{band.label}</Badge>
}

function readStoredFilters(storage: Storage): SiteExplorationListFilters {
  try {
    const raw = storage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return DEFAULT_FILTERS
    const value: unknown = JSON.parse(raw)
    if (!isStoredFilters(value)) {
      storage.removeItem(FILTER_STORAGE_KEY)
      return DEFAULT_FILTERS
    }
    return value
  } catch {
    return DEFAULT_FILTERS
  }
}

function writeStoredFilters(storage: Storage, filters: SiteExplorationListFilters): void {
  try {
    storage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // Session storage restrictions must not make the site list unusable.
  }
}

function isStoredFilters(value: unknown): value is SiteExplorationListFilters {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).sort().join(',') !== 'city,explorer,projectPrefix,route,status,team'
    || (record.status !== 'all' && !siteExplorationStatusOptions.some((option) => option.value === record.status))
    || !isStoredFilterValue(record.team, 64, true)
    || (record.explorer !== 'all' && !isStoredFilterValue(record.explorer, 64, false))
    || (record.city !== 'all' && !isStoredFilterValue(record.city, 64, false))
    || (record.route !== 'all' && !isStoredFilterValue(record.route, 32, false))
    || !isStoredFilterValue(record.projectPrefix, 128, true)
  ) return false
  return true
}

function isStoredFilterValue(value: unknown, maximumLength: number, allowEmpty: boolean): value is string {
  return typeof value === 'string'
    && value.length <= maximumLength
    && (allowEmpty || value.length > 0)
}
