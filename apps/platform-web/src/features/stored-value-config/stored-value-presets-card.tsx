import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
} from '@/components/ui/icons'

import {
  ListFilterOptionGroup,
  ListFilterRow,
  ListFilters,
  ListSearchField,
} from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatStoredValueCents } from './stored-value-config-data'
import { StoredValuePresetDialog } from './stored-value-preset-dialog'
import type {
  StoredValuePreset,
  StoredValuePresetInput,
  StoredValuePresetStatus,
} from './stored-value-config-types'

type MoveDirection = 'up' | 'down'
type StatusFilter = StoredValuePresetStatus | 'all'

const statusFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
] as const satisfies readonly { label: string; value: StatusFilter }[]

const reorderFilterReasonId = 'stored-value-preset-reorder-filter-reason'

interface StoredValuePresetsCardProps {
  presets: readonly StoredValuePreset[]
  onCreate: (input: StoredValuePresetInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (id: string) => void
}

export function StoredValuePresetsCard({
  presets,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: StoredValuePresetsCardProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StoredValuePreset>()
  const [previewPreset, setPreviewPreset] = useState<StoredValuePreset>()

  const hasActiveFilters = query.trim() !== '' || statusFilter !== 'all'
  const statusCounts = useMemo<Record<StatusFilter, number>>(() => {
    const counts = {
      all: presets.length,
      enabled: 0,
      disabled: 0,
    }

    for (const preset of presets) {
      counts[preset.status] += 1
    }

    return counts
  }, [presets])
  const filteredPresets = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')

    return presets.filter((preset) => {
      if (statusFilter !== 'all' && preset.status !== statusFilter) {
        return false
      }

      if (!keyword) {
        return true
      }

      return [preset.name, preset.marketingLabel]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(keyword)
    })
  }, [presets, query, statusFilter])
  const pagination = useTablePagination(
    filteredPresets,
    `${query}\u0000${statusFilter}`,
  )
  const presetIndexById = useMemo(
    () => new Map(presets.map((preset, index) => [preset.id, index])),
    [presets],
  )

  function openEditPage(preset: StoredValuePreset) {
    void navigate({
      to: '/stored-value-config/$presetId',
      params: { presetId: preset.id },
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>储值档位</CardTitle>
          <CardDescription>配置推荐充值金额、赠送金额和小程序展示顺序。</CardDescription>
          <CardAction>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              新增储值档位
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="档位状态">
              <ListFilterOptionGroup
                ariaLabel="按储值档位状态筛选"
                options={statusFilterOptions}
                counts={statusCounts}
                hideAllCount
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField
                value={query}
                onValueChange={setQuery}
                placeholder="搜索档位名称或营销标签"
                ariaLabel="搜索储值档位"
              />
            </ListFilterRow>
          </ListFilters>

          {hasActiveFilters ? (
            <p
              id={reorderFilterReasonId}
              className="-mt-2 text-xs text-muted-foreground sm:pl-24"
            >
              请先清除筛选条件再调整排序
            </p>
          ) : null}

          <Table containerClassName="rounded-lg border" className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">图片</TableHead>
                <TableHead>档位名称</TableHead>
                <TableHead>充值金额</TableHead>
                <TableHead>赠送金额</TableHead>
                <TableHead>到账金额</TableHead>
                <TableHead>营销标签</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPresets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无符合条件的储值档位
                  </TableCell>
                </TableRow>
              ) : pagination.pageItems.map((preset) => {
                const presetIndex = presetIndexById.get(preset.id)
                const isFirst = presetIndex === 0
                const isLast = presetIndex === presets.length - 1

                return (
                <TableRow
                  key={preset.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => openEditPage(preset)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openEditPage(preset)
                  }}
                >
                  <TableCell>
                    <button
                      type="button"
                      className="size-12 overflow-hidden rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`查看${preset.name}大图`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setPreviewPreset(preset)
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <img src={preset.imageUrl} alt="" className="size-full object-cover" />
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell className="tabular-nums">{formatStoredValueCents(preset.rechargeAmountCents)}</TableCell>
                  <TableCell className="tabular-nums">{formatStoredValueCents(preset.bonusAmountCents)}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatStoredValueCents(preset.rechargeAmountCents + preset.bonusAmountCents)}</TableCell>
                  <TableCell>{preset.marketingLabel || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={preset.status === 'enabled' ? 'default' : 'destructive'}>
                      {preset.status === 'enabled' ? '已启用' : '已停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{preset.sortOrder}</TableCell>
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${preset.name}操作菜单`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEditPage(preset)}><PencilIcon />编辑</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggle(preset.id)}><PowerIcon />{preset.status === 'enabled' ? '停用' : '启用'}</DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={hasActiveFilters || isFirst}
                            aria-describedby={hasActiveFilters ? reorderFilterReasonId : undefined}
                            onClick={() => onMove(preset.id, 'up')}
                          >
                            <ArrowUpIcon />上移
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={hasActiveFilters || isLast}
                            aria-describedby={hasActiveFilters ? reorderFilterReasonId : undefined}
                            onClick={() => onMove(preset.id, 'down')}
                          >
                            <ArrowDownIcon />下移
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(preset)}><Trash2Icon />删除</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <TablePagination
            total={filteredPresets.length}
            unit="个档位"
            pageIndex={pagination.pageIndex}
            pageCount={pagination.pageCount}
            onPageChange={pagination.changePage}
          />
        </CardContent>
      </Card>

      <StoredValuePresetDialog
        open={dialogOpen}
        presets={presets}
        onOpenChange={setDialogOpen}
        onSave={onCreate}
      />

      <Dialog open={Boolean(previewPreset)} onOpenChange={(open) => {
        if (!open) setPreviewPreset(undefined)
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{previewPreset?.name ?? '储值卡图片'}</DialogTitle></DialogHeader>
          {previewPreset ? <img src={previewPreset.imageUrl} alt={previewPreset.name} className="max-h-[70dvh] w-full rounded-lg object-contain" /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) setDeleteTarget(undefined)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除储值档位？</AlertDialogTitle>
            <AlertDialogDescription>将删除“{deleteTarget?.name ?? ''}”。本次操作仅影响当前 MOCK 页面数据。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => {
              if (deleteTarget) onDelete(deleteTarget.id)
              setDeleteTarget(undefined)
            }}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
