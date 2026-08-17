import { useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LoaderCircleIcon } from '@/components/ui/icons'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'

import { explorationTeamErrorMessage, listExplorationTeams } from './exploration-team-api'

const PAGE_LIMIT = 50
const LOAD_MORE = '__load_more_exploration_teams__'

export function ExplorationTeamSelect({
  value,
  currentName,
  disabled,
  onChange,
}: {
  value: string
  currentName?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const [namePrefix, setNamePrefix] = useState('')
  const teams = useInfiniteQuery({
    queryKey: ['exploration-teams', 'active-options', namePrefix.trim()],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listExplorationTeams({
      limit: PAGE_LIMIT,
      cursor: pageParam,
      status: 'active',
      ...(namePrefix.trim() ? { namePrefix: namePrefix.trim() } : {}),
    }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  })
  const options = useMemo(() => {
    const unique = new Map<string, { id: string; name: string }>()
    teams.data?.pages.forEach((page) => page.items.forEach((team) => unique.set(team.id, team)))
    return [...unique.values()]
  }, [teams.data])
  const currentInOptions = options.some((team) => team.id === value)

  return (
    <Field>
      <FieldLabel htmlFor="exploration-team-search">勘探小组</FieldLabel>
      <FieldDescription>从已启用的小组中选择；输入名称前缀可缩小范围。</FieldDescription>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="exploration-team-search"
          className="sm:max-w-72"
          placeholder="检索小组名称"
          disabled={disabled}
          value={namePrefix}
          onChange={(event) => setNamePrefix(event.target.value)}
        />
        <Select
          value={value}
          disabled={disabled}
          onValueChange={(next) => {
            if (next === LOAD_MORE) {
              void teams.fetchNextPage()
              return
            }
            onChange(next ?? '')
          }}
        >
          <SelectTrigger className="w-full"><SelectValue placeholder="请选择勘探小组" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>小组</SelectLabel>
              <SelectItem value="">暂不分配</SelectItem>
              {!currentInOptions && value && currentName ? <SelectItem value={value}>{currentName}（已停用）</SelectItem> : null}
              {options.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
            </SelectGroup>
            {teams.hasNextPage ? <SelectGroup><SelectItem value={LOAD_MORE} disabled={teams.isFetchingNextPage}>{teams.isFetchingNextPage ? <><LoaderCircleIcon className="animate-spin" />正在加载…</> : '加载更多小组'}</SelectItem></SelectGroup> : null}
          </SelectContent>
        </Select>
      </div>
      {teams.isError ? <FieldError>{explorationTeamErrorMessage(teams.error)}</FieldError> : null}
    </Field>
  )
}
