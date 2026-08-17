import { useEffect, useState } from 'react'
import { LoaderCircleIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import { platformErrorMessage } from './access-control-api'
import { validatePlatformUserInput, type PlatformUser, type PlatformUserInput, type PlatformUserValidationErrors } from './access-control-data'
import { useCreateMemberMutation, useUpdateMemberMutation } from './access-control-store'
import { RoleBrowser } from './role-browser'

export function PlatformUserDialog({ open, user, onOpenChange }: { open: boolean, user?: PlatformUser, onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateMemberMutation()
  const updateMutation = useUpdateMemberMutation()
  const [input, setInput] = useState<PlatformUserInput>(emptyInput)
  const [errors, setErrors] = useState<PlatformUserValidationErrors>({})
  const mutation = user ? updateMutation : createMutation
  const protectedMember = user?.protected ?? false

  useEffect(() => {
    if (!open) return
    setInput(user ? { realName: user.realName, phoneNumber: user.phoneNumber, roleIds: [...user.roleIds] } : { ...emptyInput, roleIds: [] })
    setErrors({})
    createMutation.reset()
    updateMutation.reset()
  }, [open, user])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (mutation.isPending || protectedMember) return
    const nextErrors = validatePlatformUserInput(input, Boolean(user))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    try {
      if (user) await updateMutation.mutateAsync({ id: user.id, input: { realName: input.realName, roleIds: [...input.roleIds] } })
      else await createMutation.mutateAsync({ realName: input.realName, phoneNumber: input.phoneNumber, roleIds: [...input.roleIds] })
      onOpenChange(false)
    } catch {
      // The mutation error is rendered below and the dialog remains open.
    }
  }

  function toggleRole(roleId: string, checked: boolean) {
    if (protectedMember || mutation.isPending) return
    setInput((current) => {
      if (checked && current.roleIds.length >= 8) {
        setErrors((currentErrors) => ({ ...currentErrors, roleIds: '最多只能分配 8 个角色' }))
        return current
      }
      setErrors((currentErrors) => ({ ...currentErrors, roleIds: undefined }))
      return { ...current, roleIds: checked ? [...current.roleIds, roleId] : current.roleIds.filter((id) => id !== roleId) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!mutation.isPending) onOpenChange(nextOpen) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{user ? '编辑平台用户' : '新增平台用户'}</DialogTitle><DialogDescription>{user ? '维护用户资料和角色分配。手机号由登录账号绑定，不能在此修改。' : '创建后台登录账号并分配角色；账号创建后默认为正常状态。'}</DialogDescription></DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-5 px-1 py-1">
            <FieldSet disabled={mutation.isPending || protectedMember}>
              <FieldLegend>账号信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <TextField id="platform-real-name" label="真实姓名 *" maxLength={64} value={input.realName} error={errors.realName} onChange={(value) => setInput((current) => ({ ...current, realName: value }))} />
                <TextField id="platform-phone" label="手机号 *" type="tel" maxLength={32} readOnly={Boolean(user)} value={input.phoneNumber} error={errors.phoneNumber} onChange={(value) => setInput((current) => ({ ...current, phoneNumber: value }))} />
              </FieldGroup>
            </FieldSet>
            <FieldSet disabled={mutation.isPending || protectedMember}>
              <FieldLegend>角色分配</FieldLegend>
              <RoleBrowser enabled={open} selectedIds={input.roleIds} assignedRoles={user?.roles} disabled={mutation.isPending || protectedMember} showProtectedRoles={protectedMember} onSelectionChange={(role, checked) => toggleRole(role.id, checked)} />
              <FieldError>{errors.roleIds}</FieldError>
            </FieldSet>
            {protectedMember ? <p className="text-sm text-muted-foreground">受保护的平台用户不能修改资料、角色或账号状态。</p> : null}
            {mutation.isError ? <FieldError>{platformErrorMessage(mutation.error)}</FieldError> : null}
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onOpenChange(false)}>取消</Button><Button type="submit" disabled={mutation.isPending || protectedMember}>{mutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}{user ? '保存修改' : '创建用户'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TextField({ id, label, type, maxLength, readOnly, value, error, onChange }: { id: string, label: string, type?: React.HTMLInputTypeAttribute, maxLength?: number, readOnly?: boolean, value: string, error?: string, onChange: (value: string) => void }) {
  return <Field data-invalid={Boolean(error)} data-disabled={readOnly}><FieldLabel htmlFor={id}>{label}</FieldLabel><Input id={id} type={type} maxLength={maxLength} readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} /><FieldError>{error}</FieldError></Field>
}

const emptyInput: PlatformUserInput = { realName: '', phoneNumber: '', roleIds: [] }
