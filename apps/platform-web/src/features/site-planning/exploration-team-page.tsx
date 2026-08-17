import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { CursorTablePagination } from '@/components/table-pagination'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { LoaderCircleIcon, PencilIcon, PlusIcon, UsersIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  explorationTeamErrorMessage,
  listExplorationTeams,
  setExplorationTeamStatus,
  type ExplorationTeam,
  type ExplorationTeamStatus,
} from './exploration-team-api'
import { ExplorationTeamDialog } from './exploration-team-dialog'

const PAGE_LIMIT = 20

export function ExplorationTeamPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<ExplorationTeamStatus | 'all'>('all')
  const [namePrefix, setNamePrefix] = useState('')
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ExplorationTeam>()
  const [statusTarget, setStatusTarget] = useState<ExplorationTeam>()
  const query = useMemo(() => ({
    limit: PAGE_LIMIT,
    cursor,
    ...(status !== 'all' ? { status } : {}),
    ...(namePrefix ? { namePrefix } : {}),
  }), [cursor, namePrefix, status])
  const teams = useQuery({
    queryKey: ['exploration-teams', 'list', query],
    queryFn: () => listExplorationTeams(query),
    retry: false,
  })
  const statusMutation = useMutation({
    mutationFn: ({ team, nextStatus }: { team: ExplorationTeam; nextStatus: ExplorationTeamStatus }) => (
      setExplorationTeamStatus(team.id, nextStatus, team.updatedAt)
    ),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['exploration-teams'] })
      toast.success(updated.status === 'active' ? '勘探小组已启用' : '勘探小组已停用')
    },
  })

  useEffect(() => {
    setCursor(undefined)
    setCursorHistory([])
  }, [status, namePrefix])

  async function confirmStatus(event: React.MouseEvent) {
    event.preventDefault()
    if (!statusTarget || statusMutation.isPending) return
    const nextStatus = statusTarget.status === 'active' ? 'disabled' : 'active'
    try {
      await statusMutation.mutateAsync({ team: statusTarget, nextStatus })
      setStatusTarget(undefined)
    } catch {
      // The stable API error is rendered in the confirmation dialog.
    }
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">勘探小组</h1>
          <p className="text-sm text-muted-foreground">管理勘探任务使用的小组，并从平台用户中配置小组成员。</p>
        </div>
        <Button onClick={() => { setEditingTeam(undefined); setDialogOpen(true) }}>
          <PlusIcon data-icon="inline-start" />
          新增勘探小组
        </Button>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>小组管理</CardTitle>
          <CardDescription>列表按游标分页，每页最多 {PAGE_LIMIT} 个小组；停用小组不会影响历史勘探站点。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="筛选状态">
              <ListFilterOptionGroup
                ariaLabel="按勘探小组状态筛选"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'active', label: '已启用' },
                  { value: 'disabled', label: '已停用' },
                ]}
                value={status}
                onValueChange={setStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField
                value={namePrefix}
                onValueChange={setNamePrefix}
                placeholder="搜索勘探小组名称"
                ariaLabel="按勘探小组名称搜索"
              />
            </ListFilterRow>
          </ListFilters>

          {teams.isPending ? <LoadingRows /> : teams.isError ? (
            <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><UsersIcon /></EmptyMedia><EmptyTitle>无法加载勘探小组</EmptyTitle><EmptyDescription>{explorationTeamErrorMessage(teams.error)}</EmptyDescription></EmptyHeader></Empty>
          ) : teams.data.items.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>小组名称</TableHead><TableHead>工作说明</TableHead><TableHead>成员数</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead><span className="sr-only">操作</span></TableHead></TableRow></TableHeader>
                <TableBody>{teams.data.items.map((team) => (
                  <TableRow
                    key={team.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    tabIndex={0}
                    aria-label={`查看勘探小组：${team.name}`}
                    onClick={() => void navigate({ to: '/exploration-teams/$teamId', params: { teamId: team.id } })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void navigate({ to: '/exploration-teams/$teamId', params: { teamId: team.id } })
                      }
                    }}
                  >
                    <TableCell><div className="flex min-w-40 flex-col gap-1"><span className="font-medium">{team.name}</span><span className="text-xs text-muted-foreground">小组 ID：{team.id}</span></div></TableCell>
                    <TableCell><span className="block max-w-80 truncate text-muted-foreground">{team.description || '未填写'}</span></TableCell>
                    <TableCell>{team.memberCount}</TableCell>
                    <TableCell><Badge variant={team.status === 'active' ? 'secondary' : 'outline'}>{team.status === 'active' ? '已启用' : '已停用'}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(team.updatedAt)}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { setEditingTeam(team); setDialogOpen(true) }}><PencilIcon data-icon="inline-start" />编辑</Button><Button size="sm" variant="ghost" disabled={statusMutation.isPending} onClick={() => { statusMutation.reset(); setStatusTarget(team) }}>{team.status === 'active' ? '停用' : '启用'}</Button></div></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><UsersIcon /></EmptyMedia><EmptyTitle>没有匹配的勘探小组</EmptyTitle><EmptyDescription>调整筛选条件，或新增一个勘探小组。</EmptyDescription></EmptyHeader></Empty>
          )}
          <CursorTablePagination
            summary={`本页 ${teams.data?.items.length ?? 0} 个小组`}
            previousDisabled={!cursorHistory.length || teams.isFetching}
            nextDisabled={!teams.data?.nextCursor || teams.isFetching}
            onPrevious={() => {
              const previous = cursorHistory.at(-1) ?? ''
              setCursorHistory((history) => history.slice(0, -1))
              setCursor(previous || undefined)
            }}
            onNext={() => {
              if (!teams.data?.nextCursor) return
              setCursorHistory((history) => [...history, cursor ?? ''])
              setCursor(teams.data.nextCursor ?? undefined)
            }}
          />
        </CardContent>
      </Card>

      <ExplorationTeamDialog open={dialogOpen} team={editingTeam} onOpenChange={setDialogOpen} />
      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => { if (!open && !statusMutation.isPending) setStatusTarget(undefined) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{statusTarget?.status === 'active' ? '停用勘探小组？' : '启用勘探小组？'}</AlertDialogTitle><AlertDialogDescription>{statusMutation.isError ? explorationTeamErrorMessage(statusMutation.error) : statusTarget?.status === 'active' ? `停用“${statusTarget.name}”后，新建勘探站点将不能再选择该小组。` : `启用“${statusTarget?.name ?? ''}”后，该小组可继续承接勘探任务。`}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={statusMutation.isPending}>取消</AlertDialogCancel><AlertDialogAction disabled={statusMutation.isPending} onClick={confirmStatus}>{statusMutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}确认{statusTarget?.status === 'active' ? '停用' : '启用'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function LoadingRows() {
  return <div className="flex flex-col gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
}

const dateTimeFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

function formatDateTime(timestamp: number): string {
  return dateTimeFormat.format(new Date(timestamp * 1000))
}
