import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CircleDollarSignIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatRateDateTime, formatRatePrice, getPricingModeLabel, getRateSummary, pricingModeOptions, type PricingMode, type RateTemplate } from './rate-data'
import { deleteRateTemplate, useRates } from './rate-store'
import { RateTemplateDialog } from './rate-template-dialog'

export function RateTemplateList() {
  const navigate = useNavigate()
  const templates = useRates()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<PricingMode | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<RateTemplate>()
  const filteredTemplates = useMemo(() => templates.filter((template) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return (!keyword || [template.code, template.name, template.remark].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)))
      && (mode === 'all' || template.pricingMode === mode)
  }), [mode, query, templates])
  const pagination = useTablePagination(filteredTemplates, `${query}\u0000${mode}`)

  function openCreate() {
    setDialogOpen(true)
  }

  function openEditPage(template: RateTemplate) {
    void navigate({ to: '/rates/$templateId', params: { templateId: template.id } })
  }

  return (
    <Card>
      <CardHeader><CardTitle>费率模板</CardTitle><CardDescription>管理固定电价与分时电价模板，共 {templates.length} 个。</CardDescription><CardAction><Button onClick={openCreate}><PlusIcon data-icon="inline-start" />新增模板</Button></CardAction></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="电价类型">
            <ListFilterOptionGroup ariaLabel="按电价类型筛选" options={[{ value: 'all', label: '全部' }, ...pricingModeOptions]} counts={countListFilterValues(templates, (template) => template.pricingMode)} hideAllCount value={mode} onValueChange={setMode} />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索模板名称或编号" ariaLabel="搜索费率模板" />
          </ListFilterRow>
        </ListFilters>
        {filteredTemplates.length ? <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>模板信息</TableHead><TableHead>电价类型</TableHead><TableHead>费率配置</TableHead><TableHead>备注</TableHead><TableHead>更新时间</TableHead><TableHead><span className="sr-only">操作</span></TableHead></TableRow></TableHeader>
            <TableBody>{pagination.pageItems.map((template) => (
              <TableRow
                key={template.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                onClick={() => openEditPage(template)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openEditPage(template)
                }}
              >
                <TableCell><div className="flex min-w-48 flex-col gap-1"><span className="font-medium">{template.name}</span><span className="text-xs text-muted-foreground">{template.code}</span></div></TableCell>
                <TableCell><Badge variant={template.pricingMode === 'fixed' ? 'secondary' : 'outline'}>{getPricingModeLabel(template.pricingMode)}</Badge></TableCell>
                <TableCell><div className="flex min-w-72 flex-col gap-1"><span>{getRateSummary(template)}</span>{template.pricingMode === 'time-of-use' ? <span className="text-xs text-muted-foreground">{template.periods.map((period) => `${period.startTime}–${period.endTime} ${formatRatePrice(period.electricityPrice)} + ${formatRatePrice(period.serviceFee)}`).join('；')}</span> : null}</div></TableCell>
                <TableCell><span className="block min-w-36 text-sm text-muted-foreground">{template.remark || '无'}</span></TableCell>
                <TableCell className="whitespace-nowrap">{formatRateDateTime(template.updatedAt)}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${template.name}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEditPage(template)}><PencilIcon />编辑</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeletingTemplate(template)}><Trash2Icon />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div> : <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><CircleDollarSignIcon /></EmptyMedia><EmptyTitle>没有匹配的费率模板</EmptyTitle><EmptyDescription>请调整搜索条件，或新增一个费率模板。</EmptyDescription></EmptyHeader></Empty>}
        <TablePagination total={filteredTemplates.length} unit="个模板" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>

      <RateTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <AlertDialog open={Boolean(deletingTemplate)} onOpenChange={(open) => { if (!open) setDeletingTemplate(undefined) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除费率模板？</AlertDialogTitle><AlertDialogDescription>将删除“{deletingTemplate?.name}”。历史下发记录会继续保留当时的模板快照。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (deletingTemplate) { deleteRateTemplate(deletingTemplate.id); toast.success('费率模板已删除') } setDeletingTemplate(undefined) }}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
