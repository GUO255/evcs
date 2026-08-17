import { useEffect, useMemo, useState } from 'react'
import { LoaderCircleIcon, PencilIcon, PlusIcon, UserRoundCogIcon } from '@/components/ui/icons'

import { ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { CursorTablePagination } from '@/components/table-pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { platformErrorMessage, type MemberListParams } from './access-control-api'
import { formatAccessDateTime, type PlatformUser, type PlatformUserSearchField, type PlatformUserStatus } from './access-control-data'
import { useAccessControl, useMembersQuery, useSetMemberStatusMutation } from './access-control-store'
import { PlatformUserDialog } from './platform-user-dialog'

const PAGE_LIMIT = 25

function platformUserSearch(value: string): { searchField: PlatformUserSearchField, searchValue: string } | undefined {
  const searchValue = value.trim()
  if (!searchValue) return undefined
  if (/^PU\d{1,20}$/i.test(searchValue)) return { searchField: 'code', searchValue }
  if (searchValue.includes('@')) return { searchField: 'email', searchValue }
  if (/^(?:\+?86)?1\d{0,10}$/.test(searchValue)) return { searchField: 'phone', searchValue }
  return { searchField: 'realName', searchValue }
}

export function PlatformUserList() {
  const { actorPermissions } = useAccessControl()
  const canManage = actorPermissions.has('platform-users.manage')
  const [status, setStatus] = useState<PlatformUserStatus | 'all'>('active')
  const [searchValue, setSearchValue] = useState('')
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PlatformUser>()
  const [statusTarget, setStatusTarget] = useState<PlatformUser>()
  const params = useMemo<MemberListParams>(() => ({
    limit: PAGE_LIMIT,
    cursor,
    ...platformUserSearch(searchValue),
    ...(!searchValue && status !== 'all' ? { status } : {}),
  }), [cursor, searchValue, status])
  const members = useMembersQuery(params)
  const statusMutation = useSetMemberStatusMutation()

  useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [searchValue, status])

  function changeStatus(nextStatus: PlatformUserStatus | 'all') {
    setSearchValue('')
    setStatus(nextStatus)
  }

  function changeSearch(value: string) {
    setStatus('all')
    setSearchValue(value)
  }

  function openCreate() {
    setEditingUser(undefined)
    setDialogOpen(true)
  }

  function nextPage() {
    if (!members.data?.nextCursor || members.isFetching) return
    setCursorHistory((history) => [...history, cursor ?? ''])
    setCursor(members.data.nextCursor)
  }

  function previousPage() {
    if (!cursorHistory.length || members.isFetching) return
    const previous = cursorHistory.at(-1) ?? ''
    setCursorHistory((history) => history.slice(0, -1))
    setCursor(previous || undefined)
  }

  async function confirmStatus(event: React.MouseEvent) {
    event.preventDefault()
    if (!statusTarget || statusTarget.protected || statusMutation.isPending) return
    const nextStatus = statusTarget.status === 'active' ? 'disabled' : 'active'
    try {
      await statusMutation.mutateAsync({ id: statusTarget.id, status: nextStatus })
      setStatusTarget(undefined)
    } catch {
      // The stable mutation error is rendered in the confirmation dialog.
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>平台用户管理</CardTitle><CardDescription>管理后台登录用户、账号状态和角色分配；列表按游标分页，每页最多 {PAGE_LIMIT} 个用户。</CardDescription><CardAction><Button disabled={!canManage} onClick={openCreate}><PlusIcon data-icon="inline-start" />新增平台用户</Button></CardAction></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="用户状态">
            <ListFilterOptionGroup
              ariaLabel="按平台用户状态筛选"
              options={[
                { value: 'all', label: '全部' },
                { value: 'active', label: '正常' },
                { value: 'disabled', label: '已停用' },
              ]}
              counts={members.data?.statusCounts}
              hideAllCount
              value={status}
              onValueChange={changeStatus}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={searchValue}
              onValueChange={changeSearch}
              placeholder="搜索用户编号、姓名、手机号或邮箱"
              ariaLabel="搜索平台用户"
            />
          </ListFilterRow>
        </ListFilters>
        {members.isPending ? <div className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : members.isError ? <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><UserRoundCogIcon /></EmptyMedia><EmptyTitle>无法加载平台用户</EmptyTitle><EmptyDescription>{platformErrorMessage(members.error)}</EmptyDescription></EmptyHeader></Empty> : members.data.items.length ? <div className="overflow-x-auto rounded-lg border">
          <Table><TableHeader><TableRow><TableHead>用户信息</TableHead><TableHead>联系方式</TableHead><TableHead>角色</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead><span className="sr-only">操作</span></TableHead></TableRow></TableHeader><TableBody>{members.data.items.map((user) => (
            <TableRow key={user.id}><TableCell><div className="flex min-w-40 flex-col gap-1"><div className="flex items-center gap-2"><span className="font-medium">{user.realName}</span>{user.protected ? <Badge variant="secondary">受保护</Badge> : null}</div><span className="text-xs text-muted-foreground">{user.code}</span></div></TableCell><TableCell><div className="flex min-w-48 flex-col gap-1"><span>{user.phoneNumber}</span>{user.email ? <span className="text-xs text-muted-foreground">{user.email}</span> : null}</div></TableCell><TableCell><div className="flex min-w-40 flex-wrap gap-1">{user.roles.map((role) => <Badge key={role.id} variant="outline">{role.displayName}</Badge>)}</div></TableCell><TableCell><Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status === 'active' ? '正常' : '已停用'}</Badge></TableCell><TableCell className="whitespace-nowrap">{formatAccessDateTime(user.updatedAt)}</TableCell><TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={!canManage || user.protected} onClick={() => { setEditingUser(user); setDialogOpen(true) }}><PencilIcon data-icon="inline-start" />编辑</Button><Button size="sm" variant="ghost" disabled={!canManage || user.protected || statusMutation.isPending} onClick={() => { statusMutation.reset(); setStatusTarget(user) }}>{user.status === 'active' ? '停用' : '启用'}</Button></div></TableCell></TableRow>
          ))}</TableBody></Table>
        </div> : <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><UserRoundCogIcon /></EmptyMedia><EmptyTitle>没有匹配的平台用户</EmptyTitle><EmptyDescription>请调整搜索内容或状态筛选条件。</EmptyDescription></EmptyHeader></Empty>}
        <CursorTablePagination summary={`本页 ${members.data?.items.length ?? 0} 个用户`} previousDisabled={!cursorHistory.length || members.isFetching} nextDisabled={!members.data?.nextCursor || members.isFetching} onPrevious={previousPage} onNext={nextPage} />
      </CardContent>
      <PlatformUserDialog open={dialogOpen} user={editingUser} onOpenChange={setDialogOpen} />
      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => { if (!open && !statusMutation.isPending) setStatusTarget(undefined) }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{statusTarget?.status === 'active' ? '停用平台用户？' : '启用平台用户？'}</AlertDialogTitle><AlertDialogDescription>{statusMutation.isError ? platformErrorMessage(statusMutation.error) : statusTarget?.status === 'active' ? `停用“${statusTarget.realName}”后，该账号将无法登录。` : `启用“${statusTarget?.realName ?? ''}”后，该账号将恢复登录。`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={statusMutation.isPending}>取消</AlertDialogCancel><AlertDialogAction disabled={statusMutation.isPending} onClick={confirmStatus}>{statusMutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}确认{statusTarget?.status === 'active' ? '停用' : '启用'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
  )
}
