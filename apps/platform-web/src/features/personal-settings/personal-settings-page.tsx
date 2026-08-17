import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { ArrowLeftIcon, LoaderCircleIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { platformIdentityQueryKey } from '@/features/auth/platform-identity-query'
import { type PlatformIdentity, usePlatformIdentity } from '@/features/auth/use-platform-identity'
import { accessControlKeys } from '@/features/access-control/access-control-store'

import { personalProfileErrorMessage, updatePersonalProfile } from './personal-profile-api'

export function PersonalSettingsPage() {
  const identity = usePlatformIdentity()
  const queryClient = useQueryClient()
  const [realName, setRealName] = useState(identity.data?.member.realName ?? '')
  const normalizedName = realName.trim()
  const validationError = normalizedName.length === 0 || normalizedName.length > 64
    ? '用户名称须为 1–64 个字符。'
    : undefined
  const mutation = useMutation({
    mutationFn: updatePersonalProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData<PlatformIdentity>(platformIdentityQueryKey, (current) => current
        ? { ...current, member: { ...current.member, realName: profile.realName } }
        : current)
      void queryClient.invalidateQueries({ queryKey: accessControlKeys.membersRoot })
      setRealName(profile.realName)
      toast.success('用户名称已更新。')
    },
  })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending || validationError || normalizedName === identity.data?.member.realName) return
    await mutation.mutateAsync(normalizedName).catch(() => undefined)
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div>
          <Button variant="ghost" size="sm" render={<Link to="/" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            返回
          </Button>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">个人设置</h1>
        <p className="text-sm text-muted-foreground">管理你的平台个人资料。</p>
      </header>

      <form onSubmit={submit} noValidate>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>用户名称会显示在平台顶部的账号菜单中。</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={Boolean(validationError || mutation.isError)}>
                <FieldLabel htmlFor="personal-profile-real-name">用户名称</FieldLabel>
                <Input
                  id="personal-profile-real-name"
                  autoComplete="name"
                  maxLength={64}
                  value={realName}
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(validationError || mutation.isError)}
                  onChange={(event) => {
                    setRealName(event.target.value)
                    mutation.reset()
                  }}
                />
                <FieldDescription>请输入 1–64 个字符。</FieldDescription>
                <FieldError>{validationError ?? (mutation.isError ? personalProfileErrorMessage(mutation.error) : undefined)}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              disabled={mutation.isPending || Boolean(validationError) || normalizedName === identity.data?.member.realName}
            >
              {mutation.isPending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : null}
              {mutation.isPending ? '正在保存…' : '保存修改'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </section>
  )
}
