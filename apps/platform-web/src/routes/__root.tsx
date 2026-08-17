import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'

import { useAuth } from '@/auth/auth-context'
import { AppLogo } from '@/components/brand/app-logo'
import { AppShell } from '@/components/layout/app-shell'
import { Button, buttonVariants } from '@/components/ui/button'
import { ForbiddenPage } from '@/features/auth/forbidden-page'
import { canAccessPlatformRoute } from '@/features/auth/platform-route-permissions'
import { PlatformApiError, usePlatformIdentity } from '@/features/auth/use-platform-identity'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname === '/auth/login') return <Outlet />
  return <ProtectedApplication />
}

function ProtectedApplication() {
  const { sessionStatus, restartLogin, reloadSession } = useAuth()

  if (sessionStatus === 'loading') {
    return <div className="min-h-dvh bg-background" aria-label="正在验证登录状态" />
  }
  if (sessionStatus === 'unauthenticated') {
    return <AuthenticationStatusPage title="极充智联运营平台" description="登录后才能访问平台管理端。" action={() => restartLogin()} actionLabel="去登录" />
  }
  if (sessionStatus === 'unavailable') {
    return <AuthenticationStatusPage title="认证服务暂时不可用" description="登录状态暂时无法验证，请稍后重试。" action={() => void reloadSession()} actionLabel="重试" />
  }
  return <AuthenticatedOutlet />
}

function AuthenticatedOutlet() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const identity = usePlatformIdentity()
  const status = identity.error instanceof PlatformApiError ? identity.error.status : null

  if (status === 401) return null
  if (status === 403) return <ForbiddenPage />
  if (identity.isPending) {
    return <section className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">正在加载账号信息…</section>
  }
  if (identity.isError) {
    return (
      <section className="flex min-h-64 flex-col items-center justify-center text-center">
        <h1 className="text-xl font-semibold">平台服务暂时不可用</h1>
        <p className="mt-2 text-sm text-muted-foreground">请求未能完成，请稍后重试。</p>
        <Button className="mt-5" onClick={() => void identity.refetch()}>重试</Button>
      </section>
    )
  }
  if (!canAccessPlatformRoute(pathname, identity.data.permissionSet)) return <ForbiddenPage />
  return <AppShell identity={identity.data}><Outlet /></AppShell>
}

function AuthenticationStatusPage({ title, description, action, actionLabel }: { title: string; description: string; action: () => void; actionLabel: string }) {
  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <AppLogo className="mx-auto mb-6" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <Button className="mt-6 w-full" onClick={action}>{actionLabel}</Button>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold tracking-[0.2em] text-primary">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">页面不存在</h1>
      <p className="mt-2 text-sm text-muted-foreground">请检查访问地址，或返回工作台。</p>
      <Link to="/" className={buttonVariants({ className: 'mt-6' })}>返回工作台</Link>
    </section>
  )
}
