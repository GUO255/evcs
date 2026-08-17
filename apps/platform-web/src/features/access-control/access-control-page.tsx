import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { resolveAccessControlTab } from './access-control-route'
import { AccessControlProvider, useAccessControl } from './access-control-store'

export function AccessControlPage() {
  return (
    <AccessControlProvider>
      <AccessControlContent />
    </AccessControlProvider>
  )
}

function AccessControlContent() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { actorPermissions } = useAccessControl()
  const canManagePlatformUsers = actorPermissions.has('platform-users.manage')
  const canManageRoles = actorPermissions.has('roles.manage')
  const activeTab = resolveAccessControlTab(pathname, actorPermissions)

  function navigateToTab(value: string) {
    if (value === 'platform-users' && canManagePlatformUsers) {
      void navigate({ to: '/access-control/platform-users' })
    }
    if (value === 'roles' && canManageRoles) {
      void navigate({ to: '/access-control/roles' })
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">平台权限</h1>
        <p className="text-sm text-muted-foreground">管理平台后台用户、角色分配和功能权限。</p>
      </header>
      <Tabs value={activeTab} onValueChange={navigateToTab} className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          {canManagePlatformUsers ? <TabsTrigger value="platform-users">平台用户管理</TabsTrigger> : null}
          {canManageRoles ? <TabsTrigger value="roles">角色管理</TabsTrigger> : null}
        </TabsList>
        <Outlet />
      </Tabs>
    </section>
  )
}
