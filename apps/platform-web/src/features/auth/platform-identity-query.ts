import type { QueryClient } from '@tanstack/react-query'

import { isPlatformPermission, type PlatformPermission } from './platform-route-permissions'

export const platformIdentityQueryKey = ['platform-identity'] as const

export interface PlatformIdentityRole {
  id: string
  code: string
  displayName: string
}

export interface PlatformIdentity {
  authUserId: string
  authDomain: 'platform'
  clientId: 'platform-web-bff'
  scopes: string[]
  member: {
    id: string
    code: string
    realName: string
    phoneNumber: string
    email: string | null
    protected: boolean
  }
  roles: PlatformIdentityRole[]
  permissions: PlatformPermission[]
}

export class PlatformApiError extends Error {
  constructor(readonly status: number, readonly code?: string, message = '平台服务请求失败，请稍后重试。') {
    super(message)
    this.name = 'PlatformApiError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function malformed(): never {
  throw new PlatformApiError(502, 'malformed_response', '平台服务返回了无效身份数据，请稍后重试。')
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string') || new Set(value).size !== value.length) return malformed()
  return value
}

function permissionArray(value: unknown): PlatformPermission[] {
  const permissions = stringArray(value)
  if (!permissions.every(isPlatformPermission)) return malformed()
  return permissions
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > 18_446_744_073_709_551_615n) return malformed()
  return value
}

export function parsePlatformIdentity(value: unknown): PlatformIdentity {
  if (!isRecord(value) || !exactKeys(value, ['authUserId', 'authDomain', 'clientId', 'scopes', 'member', 'roles', 'permissions'])
    || typeof value.authUserId !== 'string' || !value.authUserId || value.authDomain !== 'platform' || value.clientId !== 'platform-web-bff'
    || !isRecord(value.member) || !exactKeys(value.member, ['id', 'code', 'realName', 'phoneNumber', 'email', 'protected'])
    || typeof value.member.realName !== 'string' || typeof value.member.phoneNumber !== 'string' || !value.member.phoneNumber
    || (value.member.email !== null && typeof value.member.email !== 'string') || typeof value.member.protected !== 'boolean'
    || !Array.isArray(value.roles)) return malformed()
  const memberId = id(value.member.id)
  if (value.member.code !== `PU${memberId.padStart(6, '0')}`) return malformed()
  const roles = value.roles.map((role) => {
    if (!isRecord(role) || !exactKeys(role, ['id', 'code', 'displayName']) || typeof role.displayName !== 'string') return malformed()
    const roleId = id(role.id)
    if (role.code !== `R${roleId.padStart(6, '0')}`) return malformed()
    return { id: roleId, code: role.code, displayName: role.displayName }
  })
  return {
    authUserId: value.authUserId,
    authDomain: value.authDomain,
    clientId: value.clientId,
    scopes: stringArray(value.scopes),
    member: { id: memberId, code: value.member.code, realName: value.member.realName, phoneNumber: value.member.phoneNumber, email: value.member.email, protected: value.member.protected },
    roles,
    permissions: permissionArray(value.permissions),
  }
}

export function clearPlatformIdentity(client: QueryClient): void {
  client.removeQueries({ queryKey: platformIdentityQueryKey, exact: true })
}

export function clearPlatformAccountQueries(client: QueryClient): void {
  clearPlatformIdentity(client)
  client.removeQueries({ queryKey: ['platform-access-control'] })
}
