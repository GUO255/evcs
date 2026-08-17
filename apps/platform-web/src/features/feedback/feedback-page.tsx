import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MessageSquareReplyIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatFeedbackDateTime } from './feedback-date'
import {
  getFeedbackTypeLabel,
  type FeedbackStatus,
  type FeedbackType,
} from './feedback-data'
import type { FeedbackRecord } from './feedback-data'
import { FeedbackStatusBadge } from './feedback-status-badge'
import { useFeedbackRecords } from './feedback-store'

type TypeFilter = FeedbackType | 'all'
type StatusFilter = FeedbackStatus | 'all'

const typeOptions = [
  { value: 'all', label: '全部问题类型' },
  { value: 'complaint', label: '投诉' },
  { value: 'suggestion', label: '建议' },
] as const

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待回复' },
  { value: 'replied', label: '已回复' },
] as const

export function FeedbackPage() {
  const navigate = useNavigate()
  const records = useFeedbackRecords()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return records.filter((record) => {
      const matchesKeyword = !keyword || [
        record.code,
        record.submitterName,
        record.contact,
        record.subject,
        record.relatedTarget,
        record.content,
      ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
      return matchesKeyword
        && (type === 'all' || record.type === type)
        && (status === 'all' || record.status === status)
    })
  }, [query, records, status, type])
  const pagination = useTablePagination(filteredRecords, `${query}\u0000${type}\u0000${status}`)

  function openDetail(record: FeedbackRecord) {
    void navigate({ to: '/feedback/$feedbackId', params: { feedbackId: record.id } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">问题反馈</h1>
        <p className="text-sm text-muted-foreground">查看用户提交的问题反馈，并记录处理回复。</p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="问题类型">
              <ListFilterOptionGroup ariaLabel="按问题类型筛选" options={typeOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)} counts={countListFilterValues(records, (record) => record.type)} hideAllCount value={type} onValueChange={setType} />
            </ListFilterRow>
            <ListFilterRow label="回复状态">
              <ListFilterOptionGroup ariaLabel="按回复状态筛选" options={statusOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)} counts={countListFilterValues(records, (record) => record.status)} hideAllCount value={status} onValueChange={setStatus} />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索编号、用户、主题或关联对象" ariaLabel="搜索问题反馈" />
            </ListFilterRow>
          </ListFilters>

          <Table containerClassName="rounded-lg border" className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead>记录编号</TableHead>
                <TableHead>提交用户</TableHead>
                <TableHead>问题类型</TableHead>
                <TableHead>主题</TableHead>
                <TableHead>关联对象</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>回复时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.length > 0 ? pagination.pageItems.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => openDetail(record)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openDetail(record)
                  }}
                >
                  <TableCell className="font-medium">{record.code}</TableCell>
                  <TableCell>
                    <div className="flex min-w-36 flex-col gap-1">
                      <span>{record.submitterName}</span>
                      <span className="text-xs text-muted-foreground">{record.submitterType} · {record.contact}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{getFeedbackTypeLabel(record.type)}</Badge></TableCell>
                  <TableCell><span className="block max-w-64 truncate">{record.subject}</span></TableCell>
                  <TableCell><span className="block max-w-56 truncate">{record.relatedTarget}</span></TableCell>
                  <TableCell className="whitespace-nowrap">{formatFeedbackDateTime(record.submittedAt)}</TableCell>
                  <TableCell><FeedbackStatusBadge status={record.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatFeedbackDateTime(record.repliedAt)}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${record.code}操作菜单`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openDetail(record)}>
                            <MessageSquareReplyIcon />
                            {record.status === 'replied' ? '修改回复' : '处理回复'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={9} className="h-28 text-center text-muted-foreground">暂无符合条件的问题反馈</TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          <TablePagination total={filteredRecords.length} unit="条问题反馈" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}
