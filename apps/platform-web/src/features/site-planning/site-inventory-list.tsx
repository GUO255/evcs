import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDownIcon, LoaderCircleIcon, PencilIcon, Trash2Icon } from '@/components/ui/icons'

import {
  countListFilterValues,
  ListFilterOptionGroup,
  ListFilterRow,
  ListFilters,
  ListSearchField,
} from '@/components/list-filters'
import { TablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getSiteInventoryTypeLabel,
  siteInventoryStatusOptions,
  type SiteInventoryStatus,
  type SiteInventoryType,
} from './site-inventory-data'
import {
  deleteSiteInventoryStations,
  siteInventoryErrorMessage,
  updateSiteInventoryStationsStatus,
  type SiteInventoryRecord,
} from './site-inventory-api'
import { SiteInventoryStatusBadge } from './site-inventory-status-badge'

const siteInventoryTypeBadgeClassNames: Record<SiteInventoryType, string> = {
  planned: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
}

const stationSearchFilter: FilterFn<SiteInventoryRecord> = (
  row,
  _columnId,
  filterValue,
) => {
  const keyword = String(filterValue).trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return true

  const station = row.original
  return [
    station.stationName,
    station.provincialCity,
    station.countyDistrict,
    station.routeName,
    station.specificLocation,
    station.facilityType,
    station.statusDescription,
    station.remark,
  ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
}

export function SiteInventoryList({
  stations,
}: {
  stations: readonly SiteInventoryRecord[]
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'sequenceNumber', desc: false },
  ])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SiteInventoryStatus>('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<SiteInventoryStatus>('incomplete')
  const queryClient = useQueryClient()
  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: SiteInventoryStatus }) => (
      updateSiteInventoryStationsStatus(ids, status)
    ),
  })
  const deleteMutation = useMutation({ mutationFn: deleteSiteInventoryStations })
  const data = useMemo(() => [...stations], [stations])
  const locationOptions = useMemo(() => (
    [...new Set(stations.map((station) => station.provincialCity))]
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((city) => ({ value: city, label: city }))
  ), [stations])

  const columns = useMemo<ColumnDef<SiteInventoryRecord>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          aria-label="选择当前页全部任务站点"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`选择任务站点 ${row.original.stationName}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'sequenceNumber',
      header: ({ column }) => (
        <SortableHeader
          label="序号"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">{row.original.sequenceNumber}</span>
      ),
    },
    {
      accessorKey: 'siteType',
      header: '站点类型',
      filterFn: 'equals',
      cell: ({ row }) => <SiteInventoryTypeBadge siteType={row.original.siteType} />,
    },
    {
      accessorKey: 'stationName',
      header: '站点名称',
      cell: ({ row }) => (
        <span className="block min-w-40 max-w-72 truncate font-medium" title={row.original.stationName}>
          {row.original.stationName}
        </span>
      ),
    },
    {
      accessorKey: 'provincialCity',
      header: '省辖市',
      filterFn: 'equals',
    },
    {
      accessorKey: 'countyDistrict',
      header: '所在县（区）',
    },
    {
      accessorKey: 'routeName',
      header: '所在线路',
      cell: ({ row }) => (
        <span className="block min-w-28 max-w-56 truncate" title={row.original.routeName}>
          {row.original.routeName}
        </span>
      ),
    },
    {
      accessorKey: 'specificLocation',
      header: '具体地点',
      cell: ({ row }) => (
        <span className="block min-w-48 max-w-80 truncate" title={row.original.specificLocation}>
          {row.original.specificLocation}
        </span>
      ),
    },
    {
      accessorKey: 'facilityType',
      header: '设施类型',
    },
    {
      accessorKey: 'status',
      header: '任务状态',
      filterFn: 'equals',
      cell: ({ row }) => <SiteInventoryStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'statusDescription',
      header: '建设状态说明',
      cell: ({ row }) => (
        <span
          className="block min-w-64 max-w-96 truncate"
          title={row.original.statusDescription}
        >
          {row.original.statusDescription || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'dailyTruckTraffic2025',
      header: ({ column }) => (
        <SortableHeader
          label="2025年日均断面交通量（货车）"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.dailyTruckTraffic2025.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'dailyMediumHeavyTruckTraffic2025',
      header: ({ column }) => (
        <SortableHeader
          label="2025年日均断面交通量（中重型货车）"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.dailyMediumHeavyTruckTraffic2025.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'remark',
      header: '备注',
      cell: ({ row }) => (
        <span className="block min-w-32 max-w-72 truncate" title={row.original.remark}>
          {row.original.remark || '—'}
        </span>
      ),
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: keyword, pagination, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setKeyword,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    globalFilterFn: stationSearchFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const selectedIds = Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id)
  const mutationPending = statusMutation.isPending || deleteMutation.isPending

  const pageCount = table.getPageCount()
  useEffect(() => {
    setPagination((current) => {
      const lastPageIndex = Math.max(0, pageCount - 1)
      return current.pageIndex > lastPageIndex
        ? { ...current, pageIndex: lastPageIndex }
        : current
    })
  }, [pageCount, stations.length])

  useEffect(() => {
    const stationIds = new Set(stations.map((station) => station.id))
    setRowSelection((current) => Object.fromEntries(
      Object.entries(current).filter(([id, selected]) => selected && stationIds.has(id)),
    ))
  }, [stations])

  function changeStatusFilter(value: 'all' | SiteInventoryStatus) {
    setRowSelection({})
    setStatusFilter(value)
    table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)
    table.setPageIndex(0)
  }

  function changeLocationFilter(value: string) {
    setRowSelection({})
    setLocationFilter(value)
    table.getColumn('provincialCity')?.setFilterValue(value === 'all' ? undefined : value)
    table.setPageIndex(0)
  }

  async function updateSelectedStatus() {
    try {
      const updatedCount = await statusMutation.mutateAsync({ ids: selectedIds, status: nextStatus })
      await refreshInventoryQueries()
      setRowSelection({})
      setStatusDialogOpen(false)
      toast.success(`已修改 ${updatedCount} 个任务站点的任务状态`)
    } catch (error) {
      toast.error(siteInventoryErrorMessage(error) ?? '任务状态修改失败，请稍后重试。')
    }
  }

  async function deleteSelectedStations() {
    try {
      const deletedCount = await deleteMutation.mutateAsync(selectedIds)
      const deletedIds = new Set(selectedIds)
      queryClient.setQueryData<SiteInventoryRecord[]>(
        ['site-selection', 'inventory-stations'],
        (current) => current?.filter((station) => !deletedIds.has(station.id)),
      )
      setRowSelection({})
      setDeleteDialogOpen(false)
      toast.success(`已删除 ${deletedCount} 个任务站点`)
      void refreshInventoryQueries()
    } catch (error) {
      toast.error(siteInventoryErrorMessage(error) ?? '任务站点批量删除失败，请稍后重试。')
    }
  }

  async function refreshInventoryQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['site-selection', 'inventory-stations'],
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: ['site-selection', 'inventory-stations', 'map'],
        exact: true,
      }),
    ])
  }

  return (
    <Card className="w-full min-w-0 max-w-full">
      <CardHeader className="min-w-0">
        <ListFilters>
          <ListFilterRow label="任务状态">
            <ListFilterOptionGroup
              ariaLabel="按任务状态筛选117站点"
              options={[{ value: 'all', label: '全部' }, ...siteInventoryStatusOptions]}
              counts={countListFilterValues(stations, (station) => station.status)}
              hideAllCount
              value={statusFilter}
              onValueChange={changeStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="省辖市">
            <ListFilterOptionGroup
              ariaLabel="按省辖市筛选117站点"
              options={[{ value: 'all', label: '全部' }, ...locationOptions]}
              counts={countListFilterValues(stations, (station) => station.provincialCity)}
              hideAllCount
              value={locationFilter}
              onValueChange={changeLocationFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={keyword}
              onValueChange={(value) => {
                setRowSelection({})
                setKeyword(value)
                table.setPageIndex(0)
              }}
              placeholder="搜索站点、线路、位置、设施类型或备注"
              ariaLabel="搜索117站点"
            />
          </ListFilterRow>
        </ListFilters>
      </CardHeader>
      <CardContent className="flex w-full min-w-0 max-w-full flex-col gap-4">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <Badge variant="secondary">已选择 {selectedIds.length} 个站点</Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={mutationPending}
              onClick={() => setStatusDialogOpen(true)}
            >
              <PencilIcon data-icon="inline-start" />
              修改任务状态
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={mutationPending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              删除
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={mutationPending}
              onClick={() => setRowSelection({})}
            >
              取消选择
            </Button>
          </div>
        ) : null}
        <Table
          className="min-w-[1900px]"
          containerClassName="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border w-full min-w-0 max-w-full overflow-x-auto rounded-lg border"
        >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-14">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0
                ? table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-28 text-center text-muted-foreground"
                      >
                        没有符合当前筛选条件的117站点
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
        </Table>
        <TablePagination
          total={table.getFilteredRowModel().rows.length}
          unit="个站点"
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          onPageChange={table.setPageIndex}
        />
      </CardContent>
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量修改任务状态</DialogTitle>
            <DialogDescription>将同时修改已选择的 {selectedIds.length} 个任务站点。</DialogDescription>
          </DialogHeader>
          <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as SiteInventoryStatus)}>
            <SelectTrigger className="w-full" aria-label="选择任务状态">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {siteInventoryStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" disabled={statusMutation.isPending} onClick={() => setStatusDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={statusMutation.isPending} onClick={() => void updateSelectedStatus()}>
              {statusMutation.isPending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除已选择的任务站点？</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除 {selectedIds.length} 个任务站点，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void deleteSelectedStations()}
            >
              {deleteMutation.isPending ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" className="-ml-2" onClick={onClick}>
      {label}
      <ArrowUpDownIcon data-icon="inline-end" />
    </Button>
  )
}

function SiteInventoryTypeBadge({ siteType }: { siteType: SiteInventoryType }) {
  return (
    <Badge variant="outline" className={siteInventoryTypeBadgeClassNames[siteType]}>
      {getSiteInventoryTypeLabel(siteType)}
    </Badge>
  )
}
