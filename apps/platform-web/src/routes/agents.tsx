import { createFileRoute, Navigate } from '@tanstack/react-router'

import { AgentWorkspacePage } from '@/features/agent-workspace/agent-workspace-page'
import {
  getPermittedAgentWorkspaceTabs,
  resolveAgentWorkspaceAccess,
} from '@/features/agent-workspace/agent-workspace-permissions'
import { ForbiddenPage } from '@/features/auth/forbidden-page'
import { usePlatformIdentity } from '@/features/auth/use-platform-identity'
import { validateModuleSearch } from '@/features/product-shell/module-route'

export const Route = createFileRoute('/agents')({
  validateSearch: validateModuleSearch,
  component: ModuleRoute,
})

function ModuleRoute() {
  const { tab } = Route.useSearch()
  const identity = usePlatformIdentity()
  if (!identity.data) throw new Error('platform_identity_route_invariant')

  if (tab === 'agent-world') {
    return (
      <AgentWorkspacePage
        tab="agent-world"
        permittedTabs={getPermittedAgentWorkspaceTabs(identity.data.permissionSet)}
      />
    )
  }

  const access = resolveAgentWorkspaceAccess(tab, identity.data.permissionSet)
  if (access.kind === 'forbidden') return <ForbiddenPage />
  if (access.kind === 'redirect') {
    return <Navigate to="/agents" search={{ tab: access.tab }} replace />
  }
  return <AgentWorkspacePage tab={access.tab} permittedTabs={access.permittedTabs} />
}
