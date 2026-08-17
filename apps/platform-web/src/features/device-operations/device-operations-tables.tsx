import { useMemo, useState } from 'react'
import { ArchiveIcon, CheckCircle2Icon, EyeIcon, MoreHorizontalIcon, SearchIcon, SendIcon, WrenchIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination, useTablePagination } from '@/components/table-pagination'

import {
  formatRepairCost,
  formatOperationDateTime,
  type AlertStatus,
  type DeviceAlert,
  type RepairArchive,
  type WorkOrder,
  type WorkOrderStatus,
} from './device-operations-data'
import { AlertLevelBadge, AlertStatusBadge, WorkOrderStatusBadge } from './device-operations-badges'

export function AlertTable({ alerts, onOpen, onDispatch }: {
  alerts: readonly DeviceAlert[]
  onOpen: (alert: DeviceAlert) => void
  onDispatch: (alert: DeviceAlert) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AlertStatus | 'all'>('all')
  const filteredAlerts = useMemo(() => alerts.filter((alert) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [alert.code, alert.title, alert.stationName, alert.deviceCode]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword && (status === 'all' || alert.status === status)
  }), [alerts, query, status])
  const pagination = useTablePagination(filteredAlerts, `${query}\u0000${status}`)

  return (
    <ListCard title="设备告警列表" description={`共 ${alerts.length} 条告警，待处理 ${alerts.filter((item) => item.status === 'pending').length} 条。`}>
      <ListFilters>
        <ListFilterRow label="告警状态">
          <ListFilterOptionGroup
            ariaLabel="按告警状态筛选"
            options={[
              { value: 'all', label: '全部' },
              { value: 'pending', label: '待处理' },
              { value: 'dispatched', label: '已派发' },
              { value: 'resolved', label: '已关闭' },
            ]}
            counts={countListFilterValues(alerts, (alert) => alert.status)}
            hideAllCount
            value={status}
            onValueChange={setStatus}
          />
        </ListFilterRow>
        <ListFilterRow label="搜索">
          <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索告警编号、站点或设备" ariaLabel="搜索设备告警" />
        </ListFilterRow>
      </ListFilters>
      {filteredAlerts.length ? (
        <TableContainer>
          <Table>
            <TableHeader><TableRow>
              <TableHead>告警编号</TableHead><TableHead>告警信息</TableHead><TableHead>站点 / 设备</TableHead>
              <TableHead>发生时间</TableHead><TableHead>状态</TableHead><TableHead><span className="sr-only">操作</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>{pagination.pageItems.map((alert) => (
              <TableRow
                key={alert.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                onClick={() => onOpen(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onOpen(alert)
                }}
              >
                <TableCell className="font-medium">{alert.code}</TableCell>
                <TableCell><div className="flex min-w-48 flex-col gap-1"><div className="flex items-center gap-2"><AlertLevelBadge level={alert.level} /><span>{alert.title}</span></div><span className="text-xs text-muted-foreground">{alert.description}</span></div></TableCell>
                <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{alert.stationName}</span><span className="text-xs text-muted-foreground">{alert.deviceCode}</span></div></TableCell>
                <TableCell className="whitespace-nowrap">{formatOperationDateTime(alert.occurredAt)}</TableCell>
                <TableCell><AlertStatusBadge status={alert.status} /></TableCell>
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开设备告警${alert.code}操作菜单`} />}>
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => onOpen(alert)}><EyeIcon />查看详情</DropdownMenuItem>
                      {alert.status === 'pending' ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDispatch(alert)}><SendIcon />派发工单</DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      ) : <NoResults icon={SearchIcon} />}
      <TablePagination total={filteredAlerts.length} unit="条告警" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
    </ListCard>
  )
}

export function WorkOrderTable({ workOrders, onOpen, onComplete, onAccept }: {
  workOrders: readonly WorkOrder[]
  onOpen: (order: WorkOrder) => void
  onComplete: (order: WorkOrder) => void
  onAccept: (order: WorkOrder) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<WorkOrderStatus | 'all'>('all')
  const filteredOrders = useMemo(() => workOrders.filter((order) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [order.code, order.alertTitle, order.stationName, order.deviceCode, order.assignee]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword && (status === 'all' || order.status === status)
  }), [query, status, workOrders])
  const pagination = useTablePagination(filteredOrders, `${query}\u0000${status}`)

  return (
    <ListCard title="运维工单" description={`共 ${workOrders.length} 张工单，待验收 ${workOrders.filter((item) => item.status === 'pending-acceptance').length} 张。`}>
      <ListFilters>
        <ListFilterRow label="工单状态">
          <ListFilterOptionGroup
            ariaLabel="按工单状态筛选"
            options={[
              { value: 'all', label: '全部' },
              { value: 'processing', label: '处理中' },
              { value: 'pending-acceptance', label: '待验收' },
              { value: 'accepted', label: '已验收' },
            ]}
            counts={countListFilterValues(workOrders, (order) => order.status)}
            hideAllCount
            value={status}
            onValueChange={setStatus}
          />
        </ListFilterRow>
        <ListFilterRow label="搜索">
          <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索工单编号、站点或维修人" ariaLabel="搜索运维工单" />
        </ListFilterRow>
      </ListFilters>
      {filteredOrders.length ? (
        <TableContainer><Table>
          <TableHeader><TableRow>
            <TableHead>工单编号</TableHead><TableHead>故障信息</TableHead><TableHead>维修人员</TableHead>
            <TableHead>完成时限</TableHead><TableHead>状态</TableHead><TableHead><span className="sr-only">操作</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>{pagination.pageItems.map((order) => (
            <TableRow
              key={order.id}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              tabIndex={0}
              onClick={() => onOpen(order)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpen(order)
              }}
            >
              <TableCell className="font-medium">{order.code}</TableCell>
              <TableCell><div className="flex min-w-48 flex-col gap-1"><span>{order.alertTitle}</span><span className="text-xs text-muted-foreground">{order.stationName} · {order.deviceCode}</span></div></TableCell>
              <TableCell>{order.assignee}</TableCell>
              <TableCell className="whitespace-nowrap">{formatOperationDateTime(order.deadline)}</TableCell>
              <TableCell><WorkOrderStatusBadge status={order.status} /></TableCell>
              <TableCell
                className="text-right"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开运维工单${order.code}操作菜单`} />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onOpen(order)}><EyeIcon />查看详情</DropdownMenuItem>
                    {order.status !== 'accepted' ? <DropdownMenuSeparator /> : null}
                    {order.status === 'processing' ? <DropdownMenuItem onClick={() => onComplete(order)}><WrenchIcon />提交维修结果</DropdownMenuItem> : null}
                    {order.status === 'pending-acceptance' ? <DropdownMenuItem onClick={() => onAccept(order)}><CheckCircle2Icon />验收</DropdownMenuItem> : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></TableContainer>
      ) : <NoResults icon={SearchIcon} />}
      <TablePagination total={filteredOrders.length} unit="张工单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
    </ListCard>
  )
}

export function RepairArchiveTable({ archives, onOpen }: {
  archives: readonly RepairArchive[]
  onOpen: (archive: RepairArchive) => void
}) {
  const [query, setQuery] = useState('')
  const filteredArchives = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    if (!keyword) return archives
    return archives.filter((archive) => [archive.workOrderCode, archive.stationName, archive.deviceCode, archive.fault, archive.repairer]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)))
  }, [archives, query])
  const pagination = useTablePagination(filteredArchives, query)

  return (
    <ListCard title="维修档案" description="已通过验收的维修记录自动归档，保留故障、维修和验收信息。">
      <ListFilters>
        <ListFilterRow label="搜索">
          <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索工单、站点、设备或维修人" ariaLabel="搜索维修档案" />
        </ListFilterRow>
      </ListFilters>
      {filteredArchives.length ? (
        <TableContainer><Table>
          <TableHeader><TableRow>
            <TableHead>工单编号</TableHead><TableHead>设备信息</TableHead><TableHead>故障 / 维修结果</TableHead>
            <TableHead>维修人</TableHead><TableHead>配件 / 费用</TableHead><TableHead>验收信息</TableHead><TableHead className="text-right"><span className="sr-only">操作</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>{pagination.pageItems.map((archive) => (
            <TableRow
              key={archive.id}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              tabIndex={0}
              onClick={() => onOpen(archive)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onOpen(archive)
              }}
            >
              <TableCell className="font-medium">{archive.workOrderCode}</TableCell>
              <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{archive.stationName}</span><span className="text-xs text-muted-foreground">{archive.deviceCode}</span></div></TableCell>
              <TableCell><div className="flex min-w-56 flex-col gap-1"><span>{archive.fault}</span><span className="text-xs text-muted-foreground">{archive.resolution}</span></div></TableCell>
              <TableCell>{archive.repairer}</TableCell>
              <TableCell><div className="flex min-w-28 flex-col gap-1"><span>{archive.replacedParts}</span><span className="text-xs text-muted-foreground">{formatRepairCost(archive.cost)}</span></div></TableCell>
              <TableCell><div className="flex min-w-44 flex-col gap-1"><span>{formatOperationDateTime(archive.acceptedAt)} · {archive.acceptedBy}</span><span className="text-xs text-muted-foreground">{archive.acceptanceRemark}</span></div></TableCell>
              <TableCell
                className="text-right"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开维修档案${archive.workOrderCode}操作菜单`} />}>
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => onOpen(archive)}><EyeIcon />查看详情</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></TableContainer>
      ) : <NoResults icon={ArchiveIcon} />}
      <TablePagination total={filteredArchives.length} unit="条档案" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
    </ListCard>
  )
}

function ListCard({ title, description, children }: { title: string, description: string, children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">{children}</CardContent></Card>
}

function TableContainer({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border">{children}</div>
}

function NoResults({ icon: Icon }: { icon: typeof SearchIcon }) {
  return <Empty className="min-h-56 border"><EmptyHeader><EmptyMedia variant="icon"><Icon /></EmptyMedia><EmptyTitle>没有匹配记录</EmptyTitle><EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription></EmptyHeader></Empty>
}
