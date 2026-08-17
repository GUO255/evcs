import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  UserRoundIcon,
  UserRoundCogIcon,
} from '@/components/ui/icons'

import { useAuth } from '@/auth/auth-context'
import { AppLogo } from '@/components/brand/app-logo'
import { PlatformManagementNavigationGroups } from '@/components/layout/platform-management-sidebar'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { PlatformIdentity } from '@/features/auth/use-platform-identity'
import { AgentWorkspaceNavigationGroups } from '@/features/agent-workspace/agent-workspace-navigation'
import {
  getPermittedAgentWorkspaceTabs,
  type AgentWorkspaceTab,
  type AgentWorkspaceView,
} from '@/features/agent-workspace/agent-workspace-permissions'
import {
  type PlatformGlobalNavigationItem,
  getPermittedPlatformGlobalNavigation,
  isPlatformManagementPath,
} from '@/features/product-shell/platform-management-navigation'
import {
  getRememberedAgentWorkspaceTab,
  getRememberedPlatformManagementPath,
} from '@/features/product-shell/navigation-memory'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  identity: PlatformIdentity
}

export function AppHeader({ identity }: AppHeaderProps) {
  const { logout } = useAuth()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const agentSearchTab = useRouterState({
    select: (state) => {
      const search = state.location.search as { tab?: unknown }
      return typeof search.tab === 'string' ? search.tab : undefined
    },
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const globalNavigation = getPermittedPlatformGlobalNavigation(identity.permissionSet)
  const rememberedAgentTab = getRememberedAgentWorkspaceTab(
    window.sessionStorage,
    identity.permissionSet,
  )
  const permittedAgentTabs = getPermittedAgentWorkspaceTabs(identity.permissionSet)
  const activeAgentTab = resolveActiveAgentWorkspaceView(
    agentSearchTab,
    rememberedAgentTab,
    permittedAgentTabs,
  )
  const rememberedManagementPath = getRememberedPlatformManagementPath(
    window.sessionStorage,
    identity.permissionSet,
  )
  const homePath = globalNavigation[0]?.path
  const loginAccount = formatLoginAccount(identity.member.phoneNumber)

  function isActive(path: string): boolean {
    return globalNavigation.find((item) => item.path === path)?.activeWhen === 'platform-management'
      ? isPlatformManagementPath(pathname)
      : pathname === path
  }

  async function handleLogout() {
    if (logoutPending) return
    setLogoutPending(true)
    try {
      await logout()
    } finally {
      setLogoutPending(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 shrink-0 bg-background">
      <div className="relative flex h-14 w-full items-center gap-4 px-4 sm:h-[70px] lg:h-14 lg:px-6 2xl:h-[70px]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={(
              <Button
                className="md:hidden"
                variant="ghost"
                size="icon"
                aria-label="打开全局导航"
              />
            )}
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left" className="overflow-hidden">
            <SheetHeader>
              <SheetTitle className="sr-only">极充智联</SheetTitle>
              <AppLogo className="h-8 self-start" />
            </SheetHeader>
            <nav
              className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4"
              aria-label="移动端全局导航"
            >
              {globalNavigation.map((item) => {
                const active = isActive(item.path)
                return (
                  <div key={item.path} className="flex flex-col gap-3">
                    <GlobalNavigationLink
                      item={item}
                      rememberedAgentTab={rememberedAgentTab}
                      rememberedManagementPath={rememberedManagementPath}
                      className={cn(
                        buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'lg' }),
                        'w-full justify-start',
                      )}
                      onClick={() => setMobileOpen(false)}
                    />
                    {item.path === '/agents' && active && activeAgentTab ? (
                      <div className="ml-2 border-l border-border pl-2">
                        <AgentWorkspaceNavigationGroups
                          activeTab={activeAgentTab}
                          permittedTabs={permittedAgentTabs}
                          onNavigate={() => setMobileOpen(false)}
                        />
                      </div>
                    ) : null}
                    {item.activeWhen === 'platform-management' && active ? (
                      <div className="ml-2 border-l border-border pl-2">
                        <PlatformManagementNavigationGroups
                          pathname={pathname}
                          permissions={identity.permissionSet}
                          onNavigate={() => setMobileOpen(false)}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {homePath ? (
          <Link className="shrink-0" to={homePath} aria-label="极充智联首页">
            <AppLogo className="h-8 sm:h-11 lg:h-8 2xl:h-11" />
          </Link>
        ) : <AppLogo className="h-8 shrink-0 sm:h-11 lg:h-8 2xl:h-11" />}

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          aria-label="全局导航"
        >
          {globalNavigation.map((item) => {
            return (
              <GlobalNavigationLink
                key={item.path}
                item={item}
                rememberedAgentTab={rememberedAgentTab}
                rememberedManagementPath={rememberedManagementPath}
                className={buttonVariants({
                  variant: isActive(item.path) ? 'secondary' : 'ghost',
                  size: 'lg',
                })}
              />
            )
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <Button
                className="ml-auto max-w-[32rem]"
                variant="ghost"
                aria-label="打开平台账号菜单"
              />
            )}
          >
            <UserRoundIcon data-icon="inline-start" />
            <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
              <span className="max-w-28 truncate">{identity.member.realName}</span>
              <span className="flex min-w-0 gap-1 overflow-hidden">
                {identity.roles.map((role) => (
                  <Badge key={role.id} variant="default">
                    {role.displayName}
                  </Badge>
                ))}
              </span>
            </span>
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span>登录账号</span>
                <span className="truncate font-normal text-muted-foreground">{loginAccount}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/personal-settings" />}>
                <UserRoundCogIcon />
                个人设置
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={logoutPending}
                onClick={() => void handleLogout()}
              >
                <LogOutIcon />
                {logoutPending ? '正在退出…' : '退出登录'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

interface GlobalNavigationLinkProps {
  item: PlatformGlobalNavigationItem
  rememberedAgentTab: ReturnType<typeof getRememberedAgentWorkspaceTab>
  rememberedManagementPath: ReturnType<typeof getRememberedPlatformManagementPath>
  className: string
  onClick?: () => void
}

function GlobalNavigationLink({
  item,
  rememberedAgentTab,
  rememberedManagementPath,
  className,
  onClick,
}: GlobalNavigationLinkProps) {
  const Icon = item.icon
  const content = (
    <>
      <Icon data-icon="inline-start" />
      {item.label}
    </>
  )

  if (item.path === '/agents') {
    return (
      <Link
        className={className}
        to="/agents"
        search={rememberedAgentTab ? { tab: rememberedAgentTab } : {}}
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  return (
    <Link
      className={className}
      to={rememberedManagementPath ?? item.path}
      onClick={onClick}
    >
      {content}
    </Link>
  )
}

function formatLoginAccount(phoneNumber: string): string {
  return /^\+86\d{11}$/.test(phoneNumber) ? phoneNumber.slice(3) : phoneNumber
}

function resolveActiveAgentWorkspaceView(
  searchTab: string | undefined,
  rememberedTab: AgentWorkspaceView | undefined,
  permittedTabs: readonly AgentWorkspaceTab[],
): AgentWorkspaceView | undefined {
  if (searchTab === 'agent-world') return searchTab

  const activeTab = permittedTabs.find((tab) => tab === searchTab)
  return activeTab ?? rememberedTab ?? permittedTabs[0]
}
