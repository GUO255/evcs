import { createContext, useContext, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { platformIdentityQueryKey } from '@/features/auth/platform-identity-query'
import type { PlatformPermission } from '@/features/auth/platform-route-permissions'
import { usePlatformIdentity } from '@/features/auth/use-platform-identity'

import {
  createMember,
  createRole,
  deleteRole,
  getMembers,
  getPermissionCatalog,
  getRoles,
  setMemberStatus,
  updateMember,
  updateRole,
  type CreateMemberInput,
  type MemberListParams,
  type RoleListParams,
  type UpdateMemberInput,
} from './access-control-api'
import type { PlatformUserStatus, RoleInput } from './access-control-data'

const rootKey = ['platform-access-control'] as const

export const accessControlKeys = {
  root: rootKey,
  permissions: [...rootKey, 'permissions'] as const,
  rolesRoot: [...rootKey, 'roles'] as const,
  roles: (params: RoleListParams) => [...rootKey, 'roles', {
    limit: params.limit,
    cursor: params.cursor ?? null,
    code: params.code ?? null,
    displayName: params.displayName ?? null,
  }] as const,
  membersRoot: [...rootKey, 'members'] as const,
  members: (params: MemberListParams) => [...rootKey, 'members', {
    limit: params.limit,
    cursor: params.cursor ?? null,
    status: params.status ?? null,
    roleId: params.roleId ?? null,
    searchField: params.searchField ?? null,
    searchValue: params.searchValue ?? null,
  }] as const,
}

interface AccessControlStoreValue {
  actorPermissions: ReadonlySet<PlatformPermission>
  actorProtected: boolean
}

const AccessControlStoreContext = createContext<AccessControlStoreValue | null>(null)

export function AccessControlProvider({ children }: { children: React.ReactNode }) {
  const identity = usePlatformIdentity()
  const value = useMemo<AccessControlStoreValue>(() => ({
    actorPermissions: new Set<PlatformPermission>(identity.data?.permissions ?? []),
    actorProtected: identity.data?.member.protected ?? false,
  }), [identity.data])
  return <AccessControlStoreContext value={value}>{children}</AccessControlStoreContext>
}

export function useAccessControl(): AccessControlStoreValue {
  const context = useContext(AccessControlStoreContext)
  if (!context) throw new Error('useAccessControl must be used inside AccessControlProvider')
  return context
}

export function usePermissionCatalogQuery(enabled = true) {
  return useQuery({ queryKey: accessControlKeys.permissions, queryFn: getPermissionCatalog, staleTime: 5 * 60_000, enabled })
}

export function useRolesQuery(params: RoleListParams, enabled = true) {
  return useQuery({ queryKey: accessControlKeys.roles(params), queryFn: () => getRoles(params), enabled })
}

export function useMembersQuery(params: MemberListParams) {
  return useQuery({ queryKey: accessControlKeys.members(params), queryFn: () => getMembers(params) })
}

function useInvalidateRoles() {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: accessControlKeys.rolesRoot }),
      client.invalidateQueries({ queryKey: accessControlKeys.membersRoot }),
      client.invalidateQueries({ queryKey: platformIdentityQueryKey }),
    ])
  }
}

function useInvalidateMembers() {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: accessControlKeys.membersRoot }),
      client.invalidateQueries({ queryKey: accessControlKeys.rolesRoot }),
      client.invalidateQueries({ queryKey: platformIdentityQueryKey }),
    ])
  }
}

export function useCreateRoleMutation() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: (input: RoleInput) => createRole(input), onSuccess: invalidate })
}

export function useUpdateRoleMutation() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: ({ id, input }: { id: string, input: RoleInput }) => updateRole(id, input), onSuccess: invalidate })
}

export function useDeleteRoleMutation() {
  const invalidate = useInvalidateRoles()
  return useMutation({ mutationFn: (id: string) => deleteRole(id), onSuccess: invalidate })
}

export function useCreateMemberMutation() {
  const invalidate = useInvalidateMembers()
  return useMutation({ mutationFn: (input: CreateMemberInput) => createMember(input), onSuccess: invalidate })
}

export function useUpdateMemberMutation() {
  const invalidate = useInvalidateMembers()
  return useMutation({ mutationFn: ({ id, input }: { id: string, input: UpdateMemberInput }) => updateMember(id, input), onSuccess: invalidate })
}

export function useSetMemberStatusMutation() {
  const invalidate = useInvalidateMembers()
  return useMutation({ mutationFn: ({ id, status }: { id: string, status: PlatformUserStatus }) => setMemberStatus(id, status), onSuccess: invalidate })
}
