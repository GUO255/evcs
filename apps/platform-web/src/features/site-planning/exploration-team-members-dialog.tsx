import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { CursorTablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LoaderCircleIcon, PlusIcon, SearchIcon, UsersIcon } from '@/components/ui/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

import {
  addExplorationTeamMember,
  explorationTeamErrorMessage,
  getExplorationTeam,
  listExplorationTeamMemberCandidates,
  type ExplorationTeam,
} from './exploration-team-api'

const PAGE_LIMIT = 10

export function ExplorationTeamMembersDialog({
  open,
  team,
  onOpenChange,
}: {
  open: boolean
  team?: ExplorationTeam
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [candidateCursor, setCandidateCursor] = useState<string>()
  const [candidateHistory, setCandidateHistory] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setCandidateCursor(undefined)
    setCandidateHistory([])
    setSearchValue('')
    setAppliedSearch('')
  }, [open, team?.id])

  const teamQuery = useQuery({
    queryKey: ['exploration-teams', 'detail', team?.id],
    queryFn: () => getExplorationTeam(team!.id),
    enabled: open && Boolean(team),
    retry: false,
  })
  const currentTeam = teamQuery.data ?? team
  const candidateParams = useMemo(() => {
    const normalized = appliedSearch.trim()
    return {
      teamId: team?.id ?? '',
      limit: PAGE_LIMIT,
      cursor: candidateCursor,
      ...(/^\d+$/.test(normalized) ? { memberId: normalized } : normalized ? { namePrefix: normalized } : {}),
    }
  }, [appliedSearch, candidateCursor, team?.id])
  const candidateQuery = useQuery({
    queryKey: ['exploration-teams', 'candidates', candidateParams],
    queryFn: () => listExplorationTeamMemberCandidates(candidateParams),
    enabled: open && Boolean(team),
    retry: false,
  })
  const addMutation = useMutation({
    mutationFn: (platformMemberId: string) => addExplorationTeamMember(team!.id, platformMemberId),
    onSuccess: async () => {
      await refreshRelations(queryClient, team!.id)
      toast.success('小组成员已添加')
    },
  })

  function applySearch(event: React.FormEvent) {
    event.preventDefault()
    setCandidateCursor(undefined)
    setCandidateHistory([])
    setAppliedSearch(searchValue)
  }

  const disabled = currentTeam?.status === 'disabled'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!addMutation.isPending) onOpenChange(nextOpen) }}>
      <DialogContent className="h-[32rem] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>添加小组成员</DialogTitle>
          <DialogDescription>
            {currentTeam ? `为“${currentTeam.name}”添加平台成员，当前已有 ${currentTeam.memberCount} 人。` : '选择小组后添加成员。'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-3">
          <form onSubmit={applySearch}>
            <Field>
              <FieldLabel className="sr-only" htmlFor="team-member-search">检索平台成员</FieldLabel>
              <div className="flex gap-2">
                <Input id="team-member-search" placeholder="姓名或成员 ID" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} />
                <Button type="submit" variant="outline" disabled={candidateQuery.isFetching}><SearchIcon data-icon="inline-start" />检索</Button>
              </div>
            </Field>
          </form>
          {disabled ? <p className="text-sm text-muted-foreground">小组已停用，启用后才能添加成员。</p> : null}
          <div className="min-h-0 flex-1">
            {candidateQuery.isPending ? <LoadingRows /> : candidateQuery.isError ? <LoadError error={candidateQuery.error} /> : candidateQuery.data.items.length ? (
              <ScrollArea className="h-full rounded-lg border">
                <Table>
                  <TableBody>{candidateQuery.data.items.map((candidate) => (
                    <TableRow key={candidate.platformMemberId}>
                      <TableCell><div className="flex min-w-32 flex-col gap-0.5"><span className="font-medium">{candidate.realName}</span><span className="text-xs text-muted-foreground">{candidate.code}</span></div></TableCell>
                      <TableCell className="text-right"><Button size="sm" disabled={disabled || addMutation.isPending} onClick={() => addMutation.mutate(candidate.platformMemberId)}>{addMutation.isPending && addMutation.variables === candidate.platformMemberId ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}添加</Button></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </ScrollArea>
            ) : <Empty className="h-full min-h-36 border"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>没有可添加的成员</EmptyTitle><EmptyDescription>请调整检索条件。</EmptyDescription></EmptyHeader></Empty>}
          </div>
          {addMutation.isError ? <FieldError>{explorationTeamErrorMessage(addMutation.error)}</FieldError> : null}
          {candidateHistory.length > 0 || candidateQuery.data?.nextCursor ? (
            <CursorTablePagination
              summary={`本页 ${candidateQuery.data?.items.length ?? 0} 名候选成员`}
              previousDisabled={!candidateHistory.length || candidateQuery.isFetching}
              nextDisabled={!candidateQuery.data?.nextCursor || candidateQuery.isFetching}
              onPrevious={() => previousCursor(candidateHistory, setCandidateHistory, setCandidateCursor)}
              onNext={() => nextCursor(candidateQuery.data?.nextCursor, candidateCursor, setCandidateHistory, setCandidateCursor)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LoadingRows() {
  return <div className="flex h-full flex-col gap-2" aria-busy="true"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
}

function LoadError({ error }: { error: unknown }) {
  return <Empty className="h-full min-h-36 border"><EmptyHeader><EmptyMedia variant="icon"><UsersIcon /></EmptyMedia><EmptyTitle>无法加载成员</EmptyTitle><EmptyDescription>{explorationTeamErrorMessage(error)}</EmptyDescription></EmptyHeader></Empty>
}

async function refreshRelations(queryClient: ReturnType<typeof useQueryClient>, teamId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'members', teamId] }),
    queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'candidates'] }),
    queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'detail', teamId] }),
    queryClient.invalidateQueries({ queryKey: ['exploration-teams', 'list'] }),
  ])
}

function nextCursor(
  next: string | null | undefined,
  current: string | undefined,
  setHistory: React.Dispatch<React.SetStateAction<string[]>>,
  setCursor: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  if (!next) return
  setHistory((history) => [...history, current ?? ''])
  setCursor(next)
}

function previousCursor(
  history: string[],
  setHistory: React.Dispatch<React.SetStateAction<string[]>>,
  setCursor: React.Dispatch<React.SetStateAction<string | undefined>>,
) {
  if (!history.length) return
  const previous = history.at(-1) ?? ''
  setHistory((current) => current.slice(0, -1))
  setCursor(previous || undefined)
}
