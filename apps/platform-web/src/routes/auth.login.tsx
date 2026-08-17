import { useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { sanitizeReturnPath } from '@/auth/auth-context'
import { LoaderCircleIcon } from '@/components/ui/icons'
import { AuthStatusPage, RetryLoginButton } from '@/features/auth/auth-status-page'

export const Route = createFileRoute('/auth/login')({
  component: LoginRoute,
})

function LoginRoute() {
  const url = new URL(window.location.href)
  const returnTo = sanitizeReturnPath(url.searchParams.get('returnTo'))
  const failed = url.searchParams.get('reason') === 'authentication_failed'
  const prompt = url.searchParams.get('prompt') === 'login' ? 'login' : null
  const redirectStartedRef = useRef(false)

  useEffect(() => {
    if (failed || redirectStartedRef.current) return
    redirectStartedRef.current = true
    redirectToLogin(returnTo, prompt)
  }, [failed, prompt, returnTo])

  if (!failed) {
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center"
        aria-live="polite"
        aria-label="正在跳转到登录页面"
      >
        <LoaderCircleIcon className="size-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">正在跳转到登录页面…</p>
      </main>
    )
  }

  return (
    <AuthStatusPage
      eyebrow="AUTHENTICATION"
      title="登录未完成"
      description="认证未能完成，请检查账号信息后重新登录。"
      action={<RetryLoginButton onClick={() => redirectToLogin(returnTo, prompt)} />}
    />
  )
}

function redirectToLogin(returnTo: string, prompt: 'login' | null) {
  const loginUrl = new URL('/api/auth/login', window.location.origin)
  loginUrl.searchParams.set('returnTo', returnTo)
  if (prompt) loginUrl.searchParams.set('prompt', prompt)
  window.location.replace(loginUrl)
}
