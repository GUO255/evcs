import { useState } from 'react'
import { KeyRoundIcon, LoaderCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from '@/components/ui/icons'

import { CursorTablePagination } from '@/components/table-pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { platformErrorMessage } from './access-control-api'
import { type PlatformRole } from './access-control-data'
import { useAccessControl, useDeleteRoleMutation, usePermissionCatalogQuery, useRolesQuery } from './access-control-store'
import { RoleDialog } from './role-dialog'

const PAGE_LIMIT = 25

export function RoleList() {
  const { actorPermissions } = useAccessControl()
  const canManage = actorPermissions.has('roles.manage')
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<PlatformRole>()
  const [deletingRole, setDeletingRole] = useState<PlatformRole>()
  const roles = useRolesQuery({ limit: PAGE_LIMIT, cursor })
  const catalog = usePermissionCatalogQuery(canManage)
  const deleteMutation = useDeleteRoleMutation()

  function openCreate() {
    setEditingRole(undefined)
    setDialogOpen(true)
  }

  function nextPage() {
    if (!roles.data?.nextCursor || roles.isFetching) return
    setCursorHistory((history) => [...history, cursor ?? ''])
    setCursor(roles.data.nextCursor)
  }

  function previousPage() {
    if (!cursorHistory.length || roles.isFetching) return
    const previous = cursorHistory.at(-1) ?? ''
    setCursorHistory((history) => history.slice(0, -1))
    setCursor(previous || undefined)
  }

  async function confirmDelete(event: React.MouseEvent) {
    event.preventDefault()
    if (!deletingRole || deleteMutation.isPending || deletingRole.builtIn) return
    try {
      await deleteMutation.mutateAsync(deletingRole.id)
      setDeletingRole(undefined)
    } catch {
      // The stable mutation error is rendered in the confirmation dialog.
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>角色管理</CardTitle><CardDescription>配置角色对应的平台功能权限；列表按游标分页，每页最多 {PAGE_LIMIT} 个角色。</CardDescription><CardAction><Button disabled={!canManage} onClick={openCreate}><PlusIcon data-icon="inline-start" />新增角色</Button></CardAction></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {roles.isPending ? <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : roles.isError ? <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><KeyRoundIcon /></EmptyMedia><EmptyTitle>无法加载角色</EmptyTitle><EmptyDescription>{platformErrorMessage(roles.error)}</EmptyDescription></EmptyHeader></Empty> : roles.data.items.length ? <div className="overflow-x-auto rounded-lg border">
          <Table><TableHeader><TableRow><TableHead>角色信息</TableHead><TableHead>权限范围</TableHead><TableHead>用户数量</TableHead><TableHead><span className="sr-only">操作</span></TableHead></TableRow></TableHeader><TableBody>{roles.data.items.map((role) => (
            <TableRow key={role.id}><TableCell><div className="flex min-w-52 flex-col gap-1"><div className="flex items-center gap-2"><span className="font-medium">{role.displayName}</span>{role.builtIn ? <Badge variant="secondary">内置角色</Badge> : null}</div><span className="text-xs text-muted-foreground">{role.code}{role.description ? ` · ${role.description}` : ''}</span></div></TableCell><TableCell><div className="flex min-w-64 flex-wrap gap-1">{catalog.data ? catalog.data.map((group) => { const count = group.permissions.filter((permission) => role.permissions.includes(permission.code)).length; return count ? <Badge key={group.id} variant="outline">{group.label} {count}/{group.permissions.length}</Badge> : null }) : <Badge variant="outline">{role.permissions.length} 项权限</Badge>}</div></TableCell><TableCell>{role.memberCount} 个</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={!canManage || role.builtIn} onClick={() => { setEditingRole(role); setDialogOpen(true) }}><PencilIcon data-icon="inline-start" />配置权限</Button><Button size="sm" variant="ghost" disabled={!canManage || role.builtIn || role.memberCount > 0} onClick={() => { deleteMutation.reset(); setDeletingRole(role) }}><Trash2Icon data-icon="inline-start" />删除</Button></div></TableCell></TableRow>
          ))}</TableBody></Table>
        </div> : <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><KeyRoundIcon /></EmptyMedia><EmptyTitle>暂无角色</EmptyTitle><EmptyDescription>当前还没有角色，可以创建第一个角色。</EmptyDescription></EmptyHeader></Empty>}
        <CursorTablePagination summary={`本页 ${roles.data?.items.length ?? 0} 个角色`} previousDisabled={!cursorHistory.length || roles.isFetching} nextDisabled={!roles.data?.nextCursor || roles.isFetching} onPrevious={previousPage} onNext={nextPage} />
      </CardContent>
      <RoleDialog open={dialogOpen} role={editingRole} onOpenChange={setDialogOpen} />
      <AlertDialog open={Boolean(deletingRole)} onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeletingRole(undefined) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除角色？</AlertDialogTitle><AlertDialogDescription>{deleteMutation.isError ? platformErrorMessage(deleteMutation.error) : `将删除“${deletingRole?.displayName ?? ''}”。删除后无法恢复。`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleteMutation.isPending} onClick={confirmDelete}>{deleteMutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  )
}
