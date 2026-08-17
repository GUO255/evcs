import { useMemo, useState } from 'react'
import { EyeIcon, MoreHorizontalIcon, SendIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  distributionStatusOptions,
  formatRateDateTime,
  getDistributionStatusLabel,
  getPricingModeLabel,
  getRateDistributionRecords,
  type DistributionStatus,
  type RateDistributionRecord,
} from './rate-data'

export function RateDistributionList() {
  const records = getRateDistributionRecords()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<DistributionStatus | 'all'>('all')
  const [selectedRecord, setSelectedRecord] = useState<RateDistributionRecord>()
  const filteredRecords = useMemo(() => records.filter((record) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return (!keyword || [record.distributionCode, record.templateCode, record.templateName, record.operator].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)))
      && (status === 'all' || record.status === status)
  }), [query, records, status])
  const pagination = useTablePagination(filteredRecords, `${query}\u0000${status}`)

  return (
    <Card>
      <CardHeader><CardTitle>费率模板下发记录</CardTitle><CardDescription>查看模板下发结果及本次下发的充电桩明细。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="下发状态">
            <ListFilterOptionGroup ariaLabel="按下发状态筛选" options={[{ value: 'all', label: '全部' }, ...distributionStatusOptions]} counts={countListFilterValues(records, (record) => record.status)} hideAllCount value={status} onValueChange={setStatus} />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索下发单号、模板或操作人" ariaLabel="搜索费率下发记录" />
          </ListFilterRow>
        </ListFilters>
        {filteredRecords.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>下发单</TableHead><TableHead>费率模板</TableHead><TableHead>费率快照</TableHead><TableHead>下发结果</TableHead><TableHead>操作信息</TableHead><TableHead><span className="sr-only">操作</span></TableHead></TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => setSelectedRecord(record)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') setSelectedRecord(record)
                  }}
                >
                  <TableCell className="font-medium">{record.distributionCode}</TableCell>
                  <TableCell><div className="flex min-w-48 flex-col gap-1"><span className="font-medium">{record.templateName}</span><span className="text-xs text-muted-foreground">{record.templateCode} · {getPricingModeLabel(record.pricingMode)}</span></div></TableCell>
                  <TableCell><span className="block min-w-52">{record.rateSummary}</span></TableCell>
                  <TableCell><div className="flex min-w-32 flex-col items-start gap-1"><Badge variant={getDistributionBadgeVariant(record.status)}>{getDistributionStatusLabel(record.status)}</Badge><span className="text-xs text-muted-foreground">成功 {record.successCount} / 失败 {record.failedCount} / 共 {record.deviceCount} 台</span></div></TableCell>
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{record.operator}</span><span className="text-xs text-muted-foreground">{formatRateDateTime(record.distributedAt)}</span></div></TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${record.distributionCode}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setSelectedRecord(record)}><EyeIcon />查看详情</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><SendIcon /></EmptyMedia><EmptyTitle>没有匹配的下发记录</EmptyTitle><EmptyDescription>请调整搜索关键词或状态筛选。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredRecords.length} unit="条记录" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
      <DistributionDetailDialog record={selectedRecord} onOpenChange={(open) => { if (!open) setSelectedRecord(undefined) }} />
    </Card>
  )
}

function DistributionDetailDialog({ record, onOpenChange }: { record?: RateDistributionRecord, onOpenChange: (open: boolean) => void }) {
  const pagination = useTablePagination(record?.devices ?? [], record?.id ?? '')
  return (
    <Dialog open={Boolean(record)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-4xl">
        <DialogHeader><DialogTitle>下发充电桩明细</DialogTitle><DialogDescription>{record ? `${record.distributionCode} · ${record.templateName} · ${record.rateSummary}` : ''}</DialogDescription></DialogHeader>
        {record ? <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <div className="overflow-x-auto rounded-lg border">
            <Table><TableHeader><TableRow><TableHead>充电站</TableHead><TableHead>充电桩</TableHead><TableHead>下发状态</TableHead><TableHead>结果说明</TableHead></TableRow></TableHeader><TableBody>{pagination.pageItems.map((device) => (
              <TableRow key={device.id}><TableCell><div className="flex min-w-48 flex-col gap-1"><span className="font-medium">{device.stationName}</span><span className="text-xs text-muted-foreground">{device.stationCode}</span></div></TableCell><TableCell><div className="flex min-w-40 flex-col gap-1"><span>{device.deviceName}</span><span className="text-xs text-muted-foreground">{device.deviceCode}</span></div></TableCell><TableCell><Badge variant={device.status === 'success' ? 'default' : 'destructive'}>{device.status === 'success' ? '成功' : '失败'}</Badge></TableCell><TableCell>{device.message}</TableCell></TableRow>
            ))}</TableBody></Table>
          </div>
          <TablePagination total={record.devices.length} unit="台充电桩" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </div> : null}
      </DialogContent>
    </Dialog>
  )
}

function getDistributionBadgeVariant(status: DistributionStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'success') return 'default'
  if (status === 'failed') return 'destructive'
  return 'default'
}
