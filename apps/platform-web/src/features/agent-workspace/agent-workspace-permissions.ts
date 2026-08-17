import type { PlatformPermission } from '@/features/auth/platform-route-permissions'

import { agentWorkspaceByTab } from './agent-workspace-data'

export type AgentWorkspaceTab = keyof typeof agentWorkspaceByTab
export type AgentWorkspaceView = AgentWorkspaceTab | 'agent-world'

export const agentWorkspacePermissionByTab = {
  inspection: 'agents.inspection.use',
  'user-operations': 'agents.user-operations.use',
  'site-selection': 'agents.site-selection.use',
  'rate-strategy': 'agents.rate-strategy.use',
  'business-analysis': 'agents.business-analysis.use',
  'campaign-operations': 'agents.campaign-operations.use',
} as const satisfies Record<AgentWorkspaceTab, PlatformPermission>

const agentWorkspaceTabs = Object.keys(agentWorkspaceByTab) as AgentWorkspaceTab[]

export function getPermittedAgentWorkspaceTabs(
  permissions: ReadonlySet<PlatformPermission>,
): AgentWorkspaceTab[] {
  return agentWorkspaceTabs.filter((tab) => permissions.has(agentWorkspacePermissionByTab[tab]))
}

export type AgentWorkspaceAccess =
  | { kind: 'allowed', tab: AgentWorkspaceTab, permittedTabs: AgentWorkspaceTab[] }
  | { kind: 'redirect', tab: AgentWorkspaceTab }
  | { kind: 'forbidden' }

export function resolveAgentWorkspaceAccess(
  tab: string | undefined,
  permissions: ReadonlySet<PlatformPermission>,
): AgentWorkspaceAccess {
  const permittedTabs = getPermittedAgentWorkspaceTabs(permissions)
  const firstPermittedTab = permittedTabs[0]
  if (!firstPermittedTab) throw new Error('agent_workspace_permission_invariant')

  if (!tab || !Object.hasOwn(agentWorkspacePermissionByTab, tab)) {
    return { kind: 'redirect', tab: firstPermittedTab }
  }

  const registeredTab = tab as AgentWorkspaceTab
  if (!permissions.has(agentWorkspacePermissionByTab[registeredTab])) return { kind: 'forbidden' }
  return { kind: 'allowed', tab: registeredTab, permittedTabs }
}
