import { useState, type ElementType, type ReactNode } from 'react'

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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileTextIcon, MoreHorizontalIcon, Trash2Icon } from '@/components/ui/icons'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import type { SiteExplorationRecord } from './site-exploration-api'
import { SiteExplorationStatusBadge } from './site-exploration-status-badge'

export function SiteExplorationRecordHeader({
  record,
  heading: Heading = 'h1',
  actions,
  className,
}: {
  record: SiteExplorationRecord
  heading?: ElementType
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <Heading className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
          <span>{record.projectName || '未命名勘探站点'}</span>
          <SiteExplorationStatusBadge status={record.status} />
        </Heading>
        <HeaderMetadata
          items={[
            `勘探日期：${record.explorationDate}`,
            `创建人：${record.createdByMemberName}`,
            `最近修改人：${record.updatedByMemberName}`,
            `最近更新时间：${formatDateTime(record.updatedAt)}`,
          ]}
        />
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SiteExplorationMoreActions({
  showSetDraft,
  statusPending,
  deletionPending,
  disabled = false,
  onSetDraft,
  onDelete,
}: {
  showSetDraft: boolean
  statusPending: boolean
  deletionPending: boolean
  disabled?: boolean
  onSetDraft?: () => void
  onDelete: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const busy = disabled || statusPending || deletionPending

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon" aria-label="更多操作" disabled={busy} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {showSetDraft && onSetDraft ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onSetDraft}>
                  <FileTextIcon />
                  设置为草稿
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon />
              删除
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deletionPending) setDeleteOpen(open)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除此勘探站点？</AlertDialogTitle>
            <AlertDialogDescription>站点记录及其 OSS 图片将被删除，此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletionPending}>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deletionPending} onClick={onDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function SiteExplorationStatusAction({
  targetStatus,
  pending,
  disabled = false,
  onClick,
}: {
  targetStatus: 'draft' | 'completed'
  pending: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={targetStatus === 'draft' ? 'outline' : 'default'}
      disabled={pending || disabled}
      onClick={onClick}
    >
      {pending ? '正在设置…' : targetStatus === 'draft' ? '设置为草稿' : '设为已勘探'}
    </Button>
  )
}

function HeaderMetadata({ items }: { items: readonly string[] }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div key={item} className="flex items-center gap-2 whitespace-nowrap">
          {index > 0 ? <Separator orientation="vertical" className="h-4" aria-hidden="true" /> : null}
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatDateTime(timestamp: number): string {
  return dateTimeFormat.format(new Date(timestamp * 1000))
}
