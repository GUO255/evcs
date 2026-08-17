import { format, isValid } from 'date-fns'

import type { PlatformPermission } from '@/features/auth/platform-route-permissions'

export type PlatformUserStatus = 'active' | 'disabled'
export type PlatformUserSearchField = 'code' | 'realName' | 'phone' | 'email'
export type RoleSearchField = 'code' | 'displayName'

const MAX_UNSIGNED_BIGINT = 18_446_744_073_709_551_615n

export interface PermissionDefinition {
  code: PlatformPermission
  label: string
  description: string
}

export interface PermissionGroup {
  id: string
  label: string
  permissions: readonly PermissionDefinition[]
}

export interface PlatformRole {
  id: string
  code: string
  systemKey: string | null
  displayName: string
  description: string
  permissions: readonly PlatformPermission[]
  builtIn: boolean
  memberCount: number
}

export interface PlatformUserRole {
  id: string
  code: string
  displayName: string
}

export interface PlatformUser {
  id: string
  code: string
  realName: string
  phoneNumber: string
  email: string | null
  roleIds: readonly string[]
  roles: readonly PlatformUserRole[]
  status: PlatformUserStatus
  protected: boolean
  createdAt: number
  updatedAt: number
}

export interface RoleInput {
  displayName: string
  description: string
  permissions: PlatformPermission[]
}

export interface PlatformUserInput {
  realName: string
  phoneNumber: string
  roleIds: string[]
}

export type RoleValidationErrors = Partial<Record<'displayName' | 'description' | 'permissions', string>>
export type PlatformUserValidationErrors = Partial<Record<'realName' | 'phoneNumber' | 'roleIds', string>>

export function validateRoleInput(input: RoleInput, permissionCount: number): RoleValidationErrors {
  const errors: RoleValidationErrors = {}
  if (!input.displayName || input.displayName !== input.displayName.trim() || input.displayName.length > 64) errors.displayName = '角色名称须为 1–64 个字符，且首尾不能有空格'
  if (input.description.length > 255) errors.description = '角色说明不能超过 255 个字符'
  if (input.permissions.length === 0 || input.permissions.length > permissionCount || new Set(input.permissions).size !== input.permissions.length) {
    errors.permissions = '请选择至少一项有效权限'
  }
  return errors
}

export function isCanonicalRoleCode(value: string): boolean {
  const digits = /^R(\d+)$/.exec(value)?.[1]
  if (!digits || digits.length > 20) return false
  const id = BigInt(digits)
  return id > 0n && id <= MAX_UNSIGNED_BIGINT && value === `R${id.toString().padStart(6, '0')}`
}

export function validatePlatformUserInput(input: PlatformUserInput, editing: boolean): PlatformUserValidationErrors {
  const errors: PlatformUserValidationErrors = {}
  const realName = input.realName.trim()
  if (!realName || realName.length > 64) errors.realName = '真实姓名须为 1–64 个字符'
  if (!editing && (!/^(?:\+?86)?1[3-9]\d{9}$/.test(input.phoneNumber) || input.phoneNumber.length > 32)) errors.phoneNumber = '请输入有效的大陆手机号'
  if (input.roleIds.length < 1 || input.roleIds.length > 8 || new Set(input.roleIds).size !== input.roleIds.length) errors.roleIds = '请选择 1–8 个不同角色'
  return errors
}

export function formatAccessDateTime(value?: number): string {
  if (value === undefined) return '—'
  const date = new Date(value * 1_000)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}
