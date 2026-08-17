import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
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
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from '@/components/ui/icons'

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
  DropdownMenuSeparator,
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

import type { CampaignAction } from './campaign-action-dialog'
import {
  campaignStatusOptions,
  campaignTypeOptions,
  canDeleteCampaign,
  canEditCampaign,
  canPublishCampaign,
  canTakeCampaignOffline,
  formatCampaignBudget,
  getCampaignDisplayStatus,
  getCampaignStatusLabel,
  getCampaignTypeLabel,
  type Campaign,
  type CampaignDisplayStatus,
  type CampaignType,
} from './campaign-data'

interface CampaignDataTableProps {
  campaigns: readonly Campaign[]
  onAction: (campaign: Campaign, action: CampaignAction) => void
}

const campaignSearchFilter: FilterFn<Campaign> = (row, _columnId, filterValue) => {
  const keyword = String(filterValue).trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return true
  const campaign = row.original
  return [campaign.campaignCode, campaign.name, campaign.ruleDescription, campaign.targetAudience]
    .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
}

export function CampaignDataTable({ campaigns, onAction }: CampaignDataTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CampaignType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignDisplayStatus>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [previewCampaign, setPreviewCampaign] = useState<Campaign>()
  const data = useMemo(() => [...campaigns], [campaigns])

  const columns = useMemo<ColumnDef<Campaign>[]>(() => [
    {
      accessorKey: 'imageUrl',
      header: '活动图',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          className="block h-[60px] w-[235px] max-w-none overflow-hidden rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`查看${row.original.name}活动图`}
          onClick={(event) => {
            event.stopPropagation()
            setPreviewCampaign(row.original)
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <img src={row.original.imageUrl} alt="" className="size-full object-cover" />
        </button>
      ),
    },
    {
      accessorKey: 'campaignCode',
      header: ({ column }) => <SortableHeader label="活动编号" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="font-medium">{row.original.campaignCode}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader label="活动名称" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="block max-w-56 truncate font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: '活动类型',
      filterFn: 'equals',
      cell: ({ row }) => <Badge variant="outline">{getCampaignTypeLabel(row.original.type)}</Badge>,
    },
    {
      id: 'period',
      header: '活动周期',
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.startDate} 至 {row.original.endDate}</span>,
    },
    {
      accessorKey: 'budget',
      header: ({ column }) => <SortableHeader label="预算" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatCampaignBudget(row.original.budget)}</span>,
    },
    {
      accessorKey: 'participantCount',
      header: ({ column }) => <SortableHeader label="参与人数" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.participantCount.toLocaleString('zh-CN')}</span>,
    },
    {
      id: 'status',
      accessorFn: (campaign) => getCampaignDisplayStatus(campaign),
      header: '状态',
      filterFn: 'equals',
      cell: ({ row }) => <CampaignStatusBadge campaign={row.original} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const campaign = row.original
        return (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${campaign.name}操作菜单`} />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  disabled={!canEditCampaign(campaign)}
                  render={<Link to="/campaigns/detail/$campaignId" params={{ campaignId: campaign.id }} />}
                >
                  <PencilIcon />
                  编辑
                </DropdownMenuItem>
                {canTakeCampaignOffline(campaign) ? (
                  <DropdownMenuItem onClick={() => onAction(campaign, 'offline')}><ArrowDownIcon />下架</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled={!canPublishCampaign(campaign)} onClick={() => onAction(campaign, 'publish')}><ArrowUpIcon />上架</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={!canDeleteCampaign(campaign)} onClick={() => onAction(campaign, 'delete')}><Trash2Icon />删除</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [onAction])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: keyword, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setKeyword,
    onPaginationChange: setPagination,
    globalFilterFn: campaignSearchFilter,
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
  }, [campaigns.length, pageCount])

  function changeStatusFilter(value: string | null) {
    const nextStatus = (value ?? 'all') as 'all' | CampaignDisplayStatus
    setStatusFilter(nextStatus)
    table.getColumn('status')?.setFilterValue(nextStatus === 'all' ? undefined : nextStatus)
    table.setPageIndex(0)
  }

  function changeTypeFilter(value: string | null) {
    const nextType = (value ?? 'all') as 'all' | CampaignType
    setTypeFilter(nextType)
    table.getColumn('type')?.setFilterValue(nextType === 'all' ? undefined : nextType)
    table.setPageIndex(0)
  }

  return (
    <Card>
      <CardHeader>
        <ListFilters>
          <ListFilterRow label="活动类型">
            <ListFilterOptionGroup
              ariaLabel="按活动类型筛选"
              options={[{ value: 'all', label: '全部' }, ...campaignTypeOptions]}
              counts={countListFilterValues(campaigns, (campaign) => campaign.type)}
              hideAllCount
              value={typeFilter}
              onValueChange={changeTypeFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="活动状态">
            <ListFilterOptionGroup
              ariaLabel="按活动状态筛选"
              options={[{ value: 'all', label: '全部' }, ...campaignStatusOptions]}
              counts={countListFilterValues(campaigns, getCampaignDisplayStatus)}
              hideAllCount
              value={statusFilter}
              onValueChange={changeStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={keyword}
              onValueChange={(value) => {
                setKeyword(value)
                table.setPageIndex(0)
              }}
              placeholder="搜索活动编号、名称、规则或目标人群"
              ariaLabel="搜索活动"
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
                      to: '/campaigns/detail/$campaignId',
                      params: { campaignId: row.original.id },
                    })
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void navigate({
                        to: '/campaigns/detail/$campaignId',
                        params: { campaignId: row.original.id },
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
                    没有符合当前筛选条件的活动
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          total={table.getFilteredRowModel().rows.length}
          unit="个活动"
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          onPageChange={table.setPageIndex}
        />
      </CardContent>

      <Dialog open={Boolean(previewCampaign)} onOpenChange={(open) => {
        if (!open) setPreviewCampaign(undefined)
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{previewCampaign?.name ?? '活动图'}</DialogTitle></DialogHeader>
          {previewCampaign ? <img src={previewCampaign.imageUrl} alt={previewCampaign.name} className="aspect-[47/12] w-full rounded-lg object-cover" /> : null}
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

export function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  const status = getCampaignDisplayStatus(campaign)
  const variant = status === 'published'
    ? 'default'
    : status === 'draft'
      ? 'secondary'
      : 'destructive'
  return <Badge variant={variant}>{getCampaignStatusLabel(status)}</Badge>
}
