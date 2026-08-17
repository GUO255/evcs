import { authenticatedFetch, platformGatewayBase } from '@/auth/browser-auth-client'
import { PlatformApiError } from '@/features/auth/platform-identity-query'
import { isPlatformPermission, type PlatformPermission } from '@/features/auth/platform-route-permissions'

import type { PermissionGroup, PlatformRole, PlatformUser, PlatformUserSearchField, PlatformUserStatus, RoleInput } from './access-control-data'
import { parsePermissionCatalog } from './permission-catalog'

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
}

export interface MemberCursorPage extends CursorPage<PlatformUser> {
  statusCounts: Record<PlatformUserStatus | 'all', number>
}

export interface RoleListParams {
  limit: number
  cursor?: string
  code?: string
  displayName?: string
}

export interface MemberListParams {
  limit: number
  cursor?: string
  status?: PlatformUserStatus
  roleId?: string
  searchField?: PlatformUserSearchField
  searchValue?: string
}

export interface CreateMemberInput {
  realName: string
  phoneNumber: string
  roleIds: string[]
}

export interface UpdateMemberInput {
  realName: string
  roleIds: string[]
}

const errorMessages: Record<string, string> = {
  invalid_request: '请求内容不符合要求，请检查后重试。',
  forbidden: '当前账号无权执行此操作。',
  role_not_found: '角色不存在或已被删除。',
  role_protected: '内置超级管理员角色不能修改或删除。',
  role_in_use: '角色仍有成员使用，无法删除。',
  role_display_name_conflict: '角色名称已存在。',
  invalid_role_count: '请选择 1–8 个不同角色。',
  invalid_phone_number: '请输入有效的手机号。',
  member_not_found: '平台用户不存在或已被删除。',
  member_conflict: '手机号或账号已被其他平台用户使用。',
  auth_account_conflict: '该手机号对应的登录账号已存在冲突。',
  auth_account_not_found: '关联的登录账号不存在。',
  auth_account_forbidden: '关联登录账号不允许执行此操作。',
  auth_dependency_unavailable: '登录账号服务暂时不可用，请稍后重试。',
  auth_dependency_failed: '登录账号服务处理失败，请稍后重试。',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function malformed(): never {
  throw new PlatformApiError(502, 'malformed_response', '平台服务返回了无效数据，请稍后重试。')
}

function parseString(value: unknown): string {
  if (typeof value !== 'string') return malformed()
  return value
}

function parseNullableString(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') return malformed()
  return value as string | null
}

function parseId(value: unknown): string {
  const id = parseString(value)
  if (!/^[1-9]\d{0,19}$/.test(id) || BigInt(id) > 18_446_744_073_709_551_615n) return malformed()
  return id
}

function parseCode(value: unknown, prefix: 'R' | 'PU', id: string): string {
  const code = parseString(value)
  if (code !== `${prefix}${id.padStart(6, '0')}`) return malformed()
  return code
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string') || new Set(value).size !== value.length) return malformed()
  return value
}

function parsePermissionArray(value: unknown): PlatformPermission[] {
  const permissions = parseStringArray(value)
  if (!permissions.every(isPlatformPermission)) return malformed()
  return permissions
}

function parseRole(value: unknown): PlatformRole {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'code', 'systemKey', 'displayName', 'description', 'builtIn', 'permissions', 'memberCount'])) return malformed()
  const id = parseId(value.id)
  const memberCount = value.memberCount
  const systemKey = parseNullableString(value.systemKey)
  if (typeof value.builtIn !== 'boolean' || !Number.isSafeInteger(memberCount) || (memberCount as number) < 0
    || (value.builtIn ? !systemKey || !/^[a-z][a-z0-9-]{0,63}$/.test(systemKey) : systemKey !== null)) return malformed()
  return {
    id,
    code: parseCode(value.code, 'R', id),
    systemKey,
    displayName: parseString(value.displayName),
    description: parseString(value.description),
    builtIn: value.builtIn,
    permissions: parsePermissionArray(value.permissions),
    memberCount: memberCount as number,
  }
}

function parseMember(value: unknown): PlatformUser {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'code', 'realName', 'phoneNumber', 'email', 'status', 'protected', 'roleIds', 'roles', 'createdAt', 'updatedAt'])) return malformed()
  const id = parseId(value.id)
  if ((value.status !== 'active' && value.status !== 'disabled') || typeof value.protected !== 'boolean'
    || !Number.isSafeInteger(value.createdAt) || (value.createdAt as number) < 0
    || !Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0
    || !Array.isArray(value.roles)) return malformed()
  const roles = value.roles.map((role) => {
    if (!isRecord(role) || !hasExactKeys(role, ['id', 'code', 'displayName'])) return malformed()
    const roleId = parseId(role.id)
    return { id: roleId, code: parseCode(role.code, 'R', roleId), displayName: parseString(role.displayName) }
  })
  const roleIds = parseStringArray(value.roleIds)
  if (roles.length !== roleIds.length || roles.some((role, index) => role.id !== roleIds[index])) return malformed()
  return {
    id,
    code: parseCode(value.code, 'PU', id),
    realName: parseString(value.realName),
    phoneNumber: parseString(value.phoneNumber),
    email: parseNullableString(value.email),
    status: value.status,
    protected: value.protected,
    roleIds,
    roles,
    createdAt: value.createdAt as number,
    updatedAt: value.updatedAt as number,
  }
}

function parseCursorPage<T>(value: unknown, parseItem: (item: unknown) => T): CursorPage<T> {
  if (!isRecord(value) || !hasExactKeys(value, ['items', 'nextCursor']) || !Array.isArray(value.items)
    || (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value.nextCursor)))) return malformed()
  return { items: value.items.map(parseItem), nextCursor: value.nextCursor as string | null }
}

function parseMemberCursorPage(value: unknown): MemberCursorPage {
  if (!isRecord(value) || !hasExactKeys(value, ['items', 'nextCursor', 'statusCounts'])) return malformed()
  const page = parseCursorPage({ items: value.items, nextCursor: value.nextCursor }, parseMember)
  if (!isRecord(value.statusCounts) || !hasExactKeys(value.statusCounts, ['all', 'active', 'disabled'])) return malformed()
  const { all, active, disabled } = value.statusCounts
  if (
    !Number.isSafeInteger(all)
    || !Number.isSafeInteger(active)
    || !Number.isSafeInteger(disabled)
    || (all as number) < 0
    || (active as number) < 0
    || (disabled as number) < 0
    || all !== (active as number) + (disabled as number)
  ) return malformed()
  return {
    ...page,
    statusCounts: { all: all as number, active: active as number, disabled: disabled as number },
  }
}

async function parseError(response: Response): Promise<never> {
  let code: string | undefined
  try {
    const value: unknown = await response.json()
    if (isRecord(value) && hasExactKeys(value, ['error']) && typeof value.error === 'string' && errorMessages[value.error]) code = value.error
  } catch {
    // Error bodies are deliberately not exposed.
  }
  throw new PlatformApiError(response.status, code, code ? errorMessages[code] : '平台服务请求失败，请稍后重试。')
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await authenticatedFetch(`${platformGatewayBase}${path}`, init)
  if (!response.ok) return parseError(response)
  return response
}

async function json<T>(path: string, init: RequestInit | undefined, parser: (value: unknown) => T): Promise<T> {
  const response = await request(path, init)
  try {
    return parser(await response.json())
  } catch (error) {
    if (error instanceof PlatformApiError) throw error
    return malformed()
  }
}

export function platformErrorMessage(error: unknown): string {
  return error instanceof PlatformApiError ? error.message : '网络连接失败，请稍后重试。'
}

function queryString(params: object): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value))
  return query.toString()
}

function mutation(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export function getPermissionCatalog(): Promise<PermissionGroup[]> {
  return json('/api/access-control/permissions', undefined, parsePermissionCatalog)
}

export function getRoles(params: RoleListParams): Promise<CursorPage<PlatformRole>> {
  return json(`/api/access-control/roles?${queryString(params)}`, undefined, (value) => parseCursorPage(value, parseRole))
}

export function createRole(input: RoleInput): Promise<PlatformRole> {
  return json('/api/access-control/roles', mutation('POST', input), parseRole)
}

export function updateRole(id: string, input: RoleInput): Promise<PlatformRole> {
  return json(`/api/access-control/roles/${encodeURIComponent(id)}`, mutation('PATCH', input), parseRole)
}

export async function deleteRole(id: string): Promise<void> {
  const response = await request(`/api/access-control/roles/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (response.status !== 204) return malformed()
}

export function getMembers(params: MemberListParams): Promise<MemberCursorPage> {
  return json(`/api/access-control/members?${queryString(params)}`, undefined, parseMemberCursorPage)
}

export function createMember(input: CreateMemberInput): Promise<PlatformUser> {
  return json('/api/access-control/members', mutation('POST', input), parseMember)
}

export function updateMember(id: string, input: UpdateMemberInput): Promise<PlatformUser> {
  return json(`/api/access-control/members/${encodeURIComponent(id)}`, mutation('PATCH', input), parseMember)
}

export function setMemberStatus(id: string, status: PlatformUserStatus): Promise<{ id: string, status: PlatformUserStatus }> {
  return json(`/api/access-control/members/${encodeURIComponent(id)}/status`, mutation('POST', { status }), (value) => {
    if (!isRecord(value) || !hasExactKeys(value, ['id', 'status']) || parseId(value.id) !== id || (value.status !== 'active' && value.status !== 'disabled')) return malformed()
    return { id, status: value.status }
  })
}
