import { useEffect, useState } from 'react'
import { LoaderCircleIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { PlatformPermission } from '@/features/auth/platform-route-permissions'

import { platformErrorMessage } from './access-control-api'
import { validateRoleInput, type PlatformRole, type RoleInput, type RoleValidationErrors } from './access-control-data'
import { useAccessControl, useCreateRoleMutation, usePermissionCatalogQuery, useUpdateRoleMutation } from './access-control-store'

export function RoleDialog({ open, role, onOpenChange }: { open: boolean, role?: PlatformRole, onOpenChange: (open: boolean) => void }) {
  const { actorPermissions } = useAccessControl()
  const catalog = usePermissionCatalogQuery(open && actorPermissions.has('roles.manage'))
  const createMutation = useCreateRoleMutation()
  const updateMutation = useUpdateRoleMutation()
  const [input, setInput] = useState<RoleInput>(emptyInput)
  const [errors, setErrors] = useState<RoleValidationErrors>({})
  const mutation = role ? updateMutation : createMutation
  const permissionCount = catalog.data?.reduce((count, group) => count + group.permissions.length, 0) ?? 0

  useEffect(() => {
    if (!open) return
    setInput(role ? { displayName: role.displayName, description: role.description, permissions: [...role.permissions] } : { ...emptyInput, permissions: [] })
    setErrors({})
    createMutation.reset()
    updateMutation.reset()
  }, [open, role])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (mutation.isPending || role?.builtIn || !catalog.data) return
    const nextErrors = validateRoleInput(input, permissionCount)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const normalized = { displayName: input.displayName, description: input.description, permissions: [...input.permissions] }
    try {
      if (role) await updateMutation.mutateAsync({ id: role.id, input: normalized })
      else await createMutation.mutateAsync(normalized)
      onOpenChange(false)
    } catch {
      // The mutation error is rendered below and the dialog remains open.
    }
  }

  function togglePermission(code: PlatformPermission, checked: boolean) {
    if (!actorPermissions.has(code)) return
    setInput((current) => ({ ...current, permissions: checked ? [...current.permissions, code] : current.permissions.filter((item) => item !== code) }))
  }

  function toggleGroup(codes: readonly PlatformPermission[], checked: boolean) {
    const grantable = codes.filter((code) => actorPermissions.has(code))
    setInput((current) => ({ ...current, permissions: checked ? [...new Set([...current.permissions, ...grantable])] : current.permissions.filter((code) => !grantable.includes(code)) }))
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!mutation.isPending) onOpenChange(nextOpen) }}>
      <DialogContent className="max-h-[99vh] grid-rows-[auto_minmax(0,1fr)] sm:max-w-4xl">
        <DialogHeader><DialogTitle>{role ? '编辑角色' : '新增角色'}</DialogTitle><DialogDescription>配置角色信息和可访问的平台功能权限。</DialogDescription></DialogHeader>
        <form className="flex min-h-0 flex-col gap-4" onSubmit={submit} noValidate>
          <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 py-1">
            <FieldSet disabled={mutation.isPending || role?.builtIn}>
              <FieldLegend>角色信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(errors.displayName)}><FieldLabel htmlFor="role-display-name">角色名称 *</FieldLabel><Input id="role-display-name" maxLength={64} value={input.displayName} onChange={(event) => setInput((current) => ({ ...current, displayName: event.target.value }))} aria-invalid={Boolean(errors.displayName)} /><FieldError>{errors.displayName}</FieldError></Field>
                <Field data-invalid={Boolean(errors.description)}><FieldLabel htmlFor="role-description">角色说明</FieldLabel><Textarea id="role-description" maxLength={255} rows={2} value={input.description} onChange={(event) => setInput((current) => ({ ...current, description: event.target.value }))} aria-invalid={Boolean(errors.description)} /><FieldError>{errors.description}</FieldError></Field>
              </FieldGroup>
            </FieldSet>
            <FieldSet disabled={mutation.isPending || role?.builtIn}>
              <FieldLegend>权限配置</FieldLegend>
              {catalog.isPending ? <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div> : catalog.isError ? <Empty className="min-h-36 border"><EmptyHeader><EmptyTitle>无法加载权限目录</EmptyTitle><EmptyDescription>{platformErrorMessage(catalog.error)}</EmptyDescription></EmptyHeader></Empty> : <FieldGroup className="grid gap-4 lg:grid-cols-2">
                {catalog.data.map((group) => {
                  const codes = group.permissions.map((permission) => permission.code)
                  const grantableCodes = codes.filter((code) => actorPermissions.has(code))
                  const selectedCount = grantableCodes.filter((code) => input.permissions.includes(code)).length
                  return <FieldSet key={group.id} className="rounded-lg border p-4"><Field orientation="horizontal" data-disabled={grantableCodes.length === 0}><Checkbox id={`permission-group-${group.id}`} disabled={grantableCodes.length === 0} checked={grantableCodes.length > 0 && selectedCount === grantableCodes.length} indeterminate={selectedCount > 0 && selectedCount < grantableCodes.length} onCheckedChange={(checked) => toggleGroup(codes, checked)} parent /><FieldLabel htmlFor={`permission-group-${group.id}`} className="font-medium">{group.label}</FieldLabel></Field><FieldGroup>{group.permissions.map((permission) => {
                    const disabled = !actorPermissions.has(permission.code)
                    return <Field key={permission.code} orientation="horizontal" data-disabled={disabled}><Checkbox id={`permission-${permission.code}`} disabled={disabled} checked={input.permissions.includes(permission.code)} onCheckedChange={(checked) => togglePermission(permission.code, checked)} /><FieldLabel htmlFor={`permission-${permission.code}`}><span>{permission.label}</span><span className="font-normal text-muted-foreground">{permission.description}{disabled ? '（当前账号不可授予）' : ''}</span></FieldLabel></Field>
                  })}</FieldGroup></FieldSet>
                })}
                <FieldError className="lg:col-span-2">{errors.permissions}</FieldError>
              </FieldGroup>}
            </FieldSet>
            {mutation.isError ? <FieldError>{platformErrorMessage(mutation.error)}</FieldError> : null}
            {role?.builtIn ? <p className="text-sm text-muted-foreground">内置超级管理员角色受保护，不能编辑。</p> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>取消</Button><Button type="submit" disabled={mutation.isPending || role?.builtIn || !catalog.data}>{mutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}{role ? '保存角色' : '创建角色'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const emptyInput: RoleInput = { displayName: '', description: '', permissions: [] }
