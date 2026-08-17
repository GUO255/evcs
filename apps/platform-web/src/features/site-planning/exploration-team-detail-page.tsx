import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

import { CursorTablePagination } from '@/components/table-pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ArrowLeftIcon, LoaderCircleIcon, PencilIcon, Trash2Icon, UsersIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  ExplorationTeamApiError,
  explorationTeamErrorMessage,
  getExplorationTeam,
  listExplorationTeamMembers,
  removeExplorationTeamMember,
  type ExplorationTeamMember,
} from './exploration-team-api'
import { ExplorationTeamDialog } from './exploration-team-dialog'
import { ExplorationTeamMembersDialog } from './exploration-team-members-dialog'

const MEMBER_PAGE_LIMIT = 20

export function ExplorationTeamDetailPage({ teamId }: { teamId: string }) {
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [manageMembersOpen, setManageMembersOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ExplorationTeamMember>()
  const teamQuery = useQuery({
    queryKey: ['exploration-teams', 'detail', teamId],
    queryFn: () => getExplorationTeam(teamId),
    retry: false,
  })
  const membersQuery = useQuery({
    queryKey: ['exploration-teams', 'members', teamId, cursor],
    queryFn: () => listExplorationTeamMembers({ teamId, limit: MEMBER_PAGE_LIMIT, cursor }),
    enabled: teamQuery.isSuccess,
    retry: false,
  })
  const removeMutation = useMutation({
    mutationFn: (platformMemberId: string) => removeExplorationTeamMember(teamId, platformMemberId),
    onSuccess: async () => {
      if (membersQuery.data?.items.length === 1 && cursorHistory.length) {
        const previous = cursorHistory.at(-1) ?? ''
        setCursorHistory((history) => history.slice(0, -1))
        setCursor(previous || undefined)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'members', teamId] }),
        queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'candidates'] }),
        queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'detail', teamId] }),
        queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'list'] }),
      ])
      toast.success('小组成员已移除')
    },
  })

  useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [teamId])

  async function confirmRemove(event: React.MouseEvent) {
    event.preventDefault()
    if (!removeTarget || removeMutation.isPending) return
    try {
      await removeMutation.mutateAsync(removeTarget.platformMemberId)
      setRemoveTarget(undefined)
    } catch {
      // The stable API error is rendered in the confirmation dialog.
    }
  }

  if (teamQuery.isPending) return <DetailSkeleton />
  if (teamQuery.isError) return <DetailError error={teamQuery.error} isRetrying={teamQuery.isFetching} onRetry={() => void teamQuery.refetch()} />

  const team = teamQuery.data

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/exploration-teams" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回勘探小组
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
              <Badge variant={team.status === 'active' ? 'secondary' : 'outline'}>
                {team.status === 'active' ? '已启用' : '已停用'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">小组 ID：{team.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              编辑
            </Button>
            <Button onClick={() => setManageMembersOpen(true)}>
              <UsersIcon data-icon="inline-start" />
              添加成员
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>小组资料</CardTitle>
          <CardDescription>勘探小组的基本信息和维护时间。</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DefinitionItem className="sm:col-span-2 lg:col-span-4" label="工作说明" value={team.description || '未填写'} />
            <DefinitionItem label="成员数" value={`${team.memberCount} 人`} />
            <DefinitionItem label="创建时间" value={formatDateTime(team.createdAt)} />
            <DefinitionItem label="更新时间" value={formatDateTime(team.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>小组成员</CardTitle>
          <CardDescription>成员资料来自平台用户；已停用成员仍保留在小组关系中。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {membersQuery.isPending ? <MemberRowsSkeleton /> : membersQuery.isError ? (
            <Empty className="min-h-52 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
                <EmptyTitle>无法加载小组成员</EmptyTitle>
                <EmptyDescription>{explorationTeamErrorMessage(membersQuery.error)}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><Button variant="outline" disabled={membersQuery.isFetching} onClick={() => void membersQuery.refetch()}>{membersQuery.isFetching ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}重新加载</Button></EmptyContent>
            </Empty>
          ) : membersQuery.data.items.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>成员</TableHead>
                    <TableHead>平台状态</TableHead>
                    <TableHead>加入时间</TableHead>
                    <TableHead><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersQuery.data.items.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex min-w-40 flex-col gap-1">
                          <span className="font-medium">{member.realName}</span>
                          <span className="text-xs text-muted-foreground">成员 ID：{member.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'secondary' : 'outline'}>
                          {member.status === 'active' ? '正常' : '已停用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(member.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" disabled={removeMutation.isPending} onClick={() => { removeMutation.reset(); setRemoveTarget(member) }}>
                          <Trash2Icon data-icon="inline-start" />
                          移除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="min-h-52 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
                <EmptyTitle>当前小组暂无成员</EmptyTitle>
                <EmptyDescription>点击“添加成员”从平台用户中添加小组成员。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {membersQuery.isSuccess ? (
            <CursorTablePagination
              summary={`本页 ${membersQuery.data.items.length} 名成员`}
              previousDisabled={!cursorHistory.length || membersQuery.isFetching}
              nextDisabled={!membersQuery.data.nextCursor || membersQuery.isFetching}
              onPrevious={() => {
                const previous = cursorHistory.at(-1) ?? ''
                setCursorHistory((history) => history.slice(0, -1))
                setCursor(previous || undefined)
              }}
              onNext={() => {
                if (!membersQuery.data.nextCursor) return
                setCursorHistory((history) => [...history, cursor ?? ''])
                setCursor(membersQuery.data.nextCursor ?? undefined)
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <ExplorationTeamDialog open={editOpen} team={team} onOpenChange={setEditOpen} />
      <ExplorationTeamMembersDialog
        open={manageMembersOpen}
        team={team}
        onOpenChange={setManageMembersOpen}
      />
      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => { if (!open && !removeMutation.isPending) setRemoveTarget(undefined) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除小组成员？</AlertDialogTitle>
            <AlertDialogDescription>{removeMutation.isError ? explorationTeamErrorMessage(removeMutation.error) : `确认将“${removeTarget?.realName ?? ''}”从当前勘探小组移除？`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={removeMutation.isPending} onClick={confirmRemove}>{removeMutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}确认移除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-48" />
      <MemberRowsSkeleton />
    </section>
  )
}

function MemberRowsSkeleton() {
  return <div className="flex flex-col gap-2" aria-busy="true"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
}

function DetailError({ error, isRetrying, onRetry }: { error: unknown; isRetrying: boolean; onRetry: () => void }) {
  const notFound = error instanceof ExplorationTeamApiError && error.status === 404
  return (
    <Empty className="min-h-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
        <EmptyTitle>{notFound ? '未找到该勘探小组' : '无法加载勘探小组'}</EmptyTitle>
        <EmptyDescription>{notFound ? '当前链接中的小组 ID 无效，或小组已不存在。' : explorationTeamErrorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {notFound ? (
          <Link to="/exploration-teams" className={buttonVariants()}>返回勘探小组</Link>
        ) : (
          <Button variant="outline" disabled={isRetrying} onClick={onRetry}>{isRetrying ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}重新加载</Button>
        )}
      </EmptyContent>
    </Empty>
  )
}

function DefinitionItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className={className}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>
}

const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

function formatDateTime(timestamp: number): string {
  return dateTimeFormat.format(new Date(timestamp * 1000))
}
