import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { LoaderCircleIcon } from '@/components/ui/icons'
import { useAuth } from '@/auth/auth-context'

export function ForbiddenPage() {
  const { logout } = useAuth()
  const [logoutPending, setLogoutPending] = useState(false)

  async function handleLogout() {
    if (logoutPending) return
    setLogoutPending(true)
    try {
      await logout()
    } catch {
      setLogoutPending(false)
      toast.error('退出登录失败，请稍后重试。')
    }
  }

  return (
    <section className="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-primary">403</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">暂无平台访问权限</h1>
      <p className="mt-2 text-sm text-muted-foreground">当前账号已登录，但未获得平台端访问权限。</p>
      <Button
        className="mt-6"
        variant="outline"
        disabled={logoutPending}
        onClick={() => void handleLogout()}
      >
        {logoutPending
          ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
          : null}
        {logoutPending ? '正在退出…' : '退出并更换账号'}
      </Button>
    </section>
  )
}
