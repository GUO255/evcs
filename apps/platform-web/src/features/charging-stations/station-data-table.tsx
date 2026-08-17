import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDownIcon, EyeIcon, MoreHorizontalIcon, PencilIcon, VideoIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  getStationStatusLabel,
  getStationType,
  getStationTypeLabel,
  stationStatusOptions,
  stationTypeOptions,
  type ChargingStation,
  type StationStatus,
  type StationType,
} from './station-data'

interface StationDataTableProps {
  stations: readonly ChargingStation[]
}

const stationSearchFilter: FilterFn<ChargingStation> = (row, _columnId, filterValue) => {
  const keyword = String(filterValue).trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return true
  const station = row.original
  return [station.code, station.name, station.city, station.address, station.operatorName]
    .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
}

export function StationDataTable({ stations }: StationDataTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StationStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | StationType>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [previewStation, setPreviewStation] = useState<ChargingStation>()
  const data = useMemo(() => [...stations], [stations])

  const columns = useMemo<ColumnDef<ChargingStation>[]>(() => [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <SortableHeader label="场站编号" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: 'name',
      header: '场站名称',
      cell: ({ row }) => (
        <div className="flex max-w-80 items-center gap-3">
          <button
            type="button"
            className="size-12 shrink-0 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`查看${row.original.name}图片`}
            onClick={(event) => {
              event.stopPropagation()
              setPreviewStation(row.original)
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <img className="size-full object-cover" src={row.original.images[0]} alt="" loading="lazy" />
          </button>
          <span className="truncate font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: '运营状态',
      filterFn: 'equals',
      cell: ({ row }) => <StationStatusBadge status={row.original.status} />,
    },
    {
      id: 'type',
      accessorFn: getStationType,
      header: '类型',
      filterFn: 'equals',
      cell: ({ row }) => <StationTypeBadge type={getStationType(row.original)} />,
    },
    { accessorKey: 'city', header: '城市' },
    {
      accessorKey: 'operatorName',
      header: '运营商户',
      cell: ({ row }) => <span className="block max-w-56 truncate">{row.original.operatorName}</span>,
    },
    {
      id: 'chargers',
      accessorFn: (station) => station.dcChargerCount + station.acChargerCount,
      header: ({ column }) => (
        <SortableHeader label="充电桩" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
      ),
      cell: ({ row }) => `${row.original.dcChargerCount + row.original.acChargerCount} 台`,
    },
    {
      accessorKey: 'connectorCount',
      header: ({ column }) => (
        <SortableHeader label="充电枪" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
      ),
      cell: ({ row }) => `${row.original.connectorCount} 把`,
    },
    { accessorKey: 'serviceHours', header: '服务时间' },
    {
      accessorKey: 'openedAt',
      header: ({ column }) => (
        <SortableHeader label="投运日期" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${row.original.name}操作菜单`} />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => {
                void navigate({ to: '/stations/$stationId', params: { stationId: row.original.id }, search: { tab: 'basic-information' } })
              }}><EyeIcon />查看详情</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void navigate({ to: '/stations/$stationId', params: { stationId: row.original.id }, search: { tab: 'basic-information' } })
              }}><PencilIcon />编辑资料</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void navigate({ to: '/stations/$stationId', params: { stationId: row.original.id }, search: { tab: 'video-monitoring' } })
              }}><VideoIcon />视频监控</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [navigate])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: keyword, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setKeyword,
    onPaginationChange: setPagination,
    globalFilterFn: stationSearchFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = table.getPageCount()
  useEffect(() => {
    setPagination((current) => {
      const lastPageIndex = Math.max(0, pageCount - 1)
      return current.pageIndex > lastPageIndex
        ? { ...current, pageIndex: lastPageIndex }
        : current
    })
  }, [pageCount, stations.length])

  function changeStatusFilter(value: string | null) {
    const nextStatus = (value ?? 'all') as 'all' | StationStatus
    setStatusFilter(nextStatus)
    table.getColumn('status')?.setFilterValue(nextStatus === 'all' ? undefined : nextStatus)
    table.setPageIndex(0)
  }

  function changeTypeFilter(value: string | null) {
    const nextType = (value ?? 'all') as 'all' | StationType
    setTypeFilter(nextType)
    table.getColumn('type')?.setFilterValue(nextType === 'all' ? undefined : nextType)
    table.setPageIndex(0)
  }

  return (
    <Card>
      <CardHeader>
        <ListFilters>
          <ListFilterRow label="运营状态">
            <ListFilterOptionGroup
              ariaLabel="按运营状态筛选"
              options={[{ value: 'all', label: '全部' }, ...stationStatusOptions]}
              counts={countListFilterValues(stations, (station) => station.status)}
              hideAllCount
              value={statusFilter}
              onValueChange={changeStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="场站类型">
            <ListFilterOptionGroup
              ariaLabel="按充电站类型筛选"
              options={[{ value: 'all', label: '全部' }, ...stationTypeOptions]}
              counts={countListFilterValues(stations, getStationType)}
              hideAllCount
              value={typeFilter}
              onValueChange={changeTypeFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={keyword}
              onValueChange={(value) => {
                setKeyword(value)
                table.setPageIndex(0)
              }}
              placeholder="搜索场站名称、编号、地址或运营商户"
              ariaLabel="搜索充电站"
            />
          </ListFilterRow>
        </ListFilters>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={header.column.id === 'actions' ? 'text-right' : undefined}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => {
                    void navigate({
                      to: '/stations/$stationId',
                      params: { stationId: row.original.id },
                      search: { tab: 'basic-information' },
                    })
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void navigate({
                        to: '/stations/$stationId',
                        params: { stationId: row.original.id },
                        search: { tab: 'basic-information' },
                      })
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                    没有符合当前筛选条件的充电站
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          total={table.getFilteredRowModel().rows.length}
          unit="个充电站"
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          onPageChange={table.setPageIndex}
        />
      </CardContent>

      <Dialog open={Boolean(previewStation)} onOpenChange={(open) => {
        if (!open) setPreviewStation(undefined)
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{previewStation?.name ?? '场站图片'}</DialogTitle></DialogHeader>
          {previewStation ? <img src={previewStation.images[0]} alt={previewStation.name} className="max-h-[70dvh] w-full rounded-lg object-contain" /> : null}
        </DialogContent>
      </Dialog>
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

export function StationStatusBadge({ status }: { status: StationStatus }) {
  const variant = status === 'operating'
    ? 'default'
    : status === 'maintenance'
      ? 'destructive'
      : 'secondary'
  return <Badge variant={variant}>{getStationStatusLabel(status)}</Badge>
}

function StationTypeBadge({ type }: { type: StationType }) {
  return <Badge variant={type === 'self-operated' ? 'default' : 'destructive'}>{getStationTypeLabel(type)}</Badge>
}
