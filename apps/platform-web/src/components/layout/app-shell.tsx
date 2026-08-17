import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { AppHeader } from '@/components/layout/app-header'
import { PlatformManagementSidebar } from '@/components/layout/platform-management-sidebar'
import { SidebarPageLayout } from '@/components/layout/sidebar-page-layout'
import type { PlatformIdentity } from '@/features/auth/use-platform-identity'
import { CampaignProvider } from '@/features/campaigns/campaign-store'
import { StationProvider } from '@/features/charging-stations/station-store'
import { CustomerProvider } from '@/features/contracted-customers/customer-store'
import { MerchantProvider } from '@/features/contracted-merchants/merchant-store'
import { isPlatformManagementPath } from '@/features/product-shell/platform-management-navigation'
import { cn } from '@/lib/utils'

interface AppShellProps {
  identity: PlatformIdentity
  children: ReactNode
}

export function AppShell({ identity, children }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const managementPage = isPlatformManagementPath(pathname)
  const agentWorkspacePage = pathname === '/agents'
  const sidebarPage = managementPage || agentWorkspacePage

  return (
    <MerchantProvider>
      <CustomerProvider>
        <CampaignProvider>
          <StationProvider>
            <div
              className={cn(
                'bg-background',
                sidebarPage
                  ? 'fixed inset-0 flex h-dvh w-dvw flex-col overflow-hidden'
                  : 'min-h-dvh',
              )}
            >
              <AppHeader identity={identity} />
              {managementPage ? (
                <SidebarPageLayout
                  sidebar={<PlatformManagementSidebar pathname={pathname} permissions={identity.permissionSet} />}
                  flushContent={pathname === '/site-selection-map'}
                >
                  {children}
                </SidebarPageLayout>
              ) : agentWorkspacePage ? (
                children
              ) : (
                <main className="w-full px-4 py-6 lg:px-6">
                  {children}
                </main>
              )}
            </div>
          </StationProvider>
        </CampaignProvider>
      </CustomerProvider>
    </MerchantProvider>
  )
}
