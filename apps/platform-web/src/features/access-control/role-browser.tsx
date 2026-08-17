import { useEffect, useId, useMemo, useState } from 'react'

import { CursorTablePagination } from '@/components/table-pagination'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'

import { platformErrorMessage, type RoleListParams } from './access-control-api'
import { type PlatformRole, type PlatformUserRole } from './access-control-data'
import { useRolesQuery } from './access-control-store'

const PAGE_LIMIT = 25

type RoleChoice = PlatformRole | PlatformUserRole

interface RoleBrowserProps {
  enabled: boolean
  selectedIds: readonly string[]
  assignedRoles?: readonly PlatformUserRole[]
  disabled?: boolean
  showProtectedRoles?: boolean
  onSelectionChange: (role: RoleChoice, checked: boolean) => void
}

export function RoleBrowser({ enabled, selectedIds, assignedRoles = [], disabled = false, showProtectedRoles = false, onSelectionChange }: RoleBrowserProps) {
  const instanceId = useId()
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [roleCache, setRoleCache] = useState<ReadonlyMap<string, RoleChoice>>(new Map())
  const params = useMemo<RoleListParams>(() => ({
    limit: PAGE_LIMIT,
    cursor,
  }), [cursor])
  const roles = useRolesQuery(params, enabled)

  useEffect(() => {
    if (!enabled) return
    setCursor(undefined)
    setCursorHistory([])
    setRoleCache(new Map(assignedRoles.map((role) => [role.id, role])))
  }, [enabled])

  useEffect(() => {
    if (!roles.data) return
    setRoleCache((current) => {
      const next = new Map(current)
      for (const role of roles.data.items) next.set(role.id, role)
      return next
    })
  }, [roles.data])

  const visibleRoles = useMemo(() => {
    const byId = new Map<string, RoleChoice>()
    for (const role of roles.data?.items ?? []) byId.set(role.id, role)
    for (const role of assignedRoles) if (!byId.has(role.id)) byId.set(role.id, role)
    for (const id of selectedIds) {
      const role = roleCache.get(id)
      if (role && !byId.has(id)) byId.set(id, role)
    }
    const choices = [...byId.values()]
    return showProtectedRoles
      ? choices
      : choices.filter((role) => !('systemKey' in role && role.systemKey === 'platform-super-admin'))
  }, [assignedRoles, roleCache, roles.data?.items, selectedIds, showProtectedRoles])

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

  return (
    <div className="flex flex-col gap-3">
      {roles.isPending ? <div className="grid gap-3 md:grid-cols-2" aria-busy="true"><Skeleton className="h-9" /><Skeleton className="h-9" /></div> : roles.isError ? <Empty className="min-h-36 border"><EmptyHeader><EmptyTitle>无法加载角色</EmptyTitle><EmptyDescription>{platformErrorMessage(roles.error)}</EmptyDescription></EmptyHeader></Empty> : visibleRoles.length ? <FieldGroup className="grid gap-3 md:grid-cols-2">
        {visibleRoles.map((role) => {
          const checked = selectedIds.includes(role.id)
          const checkboxId = `${instanceId}-role-${role.id}`
          return <Field key={role.id} orientation="horizontal"><Checkbox id={checkboxId} disabled={disabled} checked={checked} onCheckedChange={(nextChecked) => onSelectionChange(role, nextChecked)} /><FieldLabel htmlFor={checkboxId}>{role.displayName}</FieldLabel></Field>
        })}
      </FieldGroup> : <Empty className="min-h-36 border"><EmptyHeader><EmptyTitle>暂无可分配角色</EmptyTitle><EmptyDescription>请先创建可用角色。</EmptyDescription></EmptyHeader></Empty>}
      {cursorHistory.length || roles.data?.nextCursor ? <CursorTablePagination summary={`已选 ${selectedIds.length} 个角色`} previousDisabled={!cursorHistory.length || roles.isFetching || disabled} nextDisabled={!roles.data?.nextCursor || roles.isFetching || disabled} onPrevious={previousPage} onNext={nextPage} /> : null}
    </div>
  )
}
