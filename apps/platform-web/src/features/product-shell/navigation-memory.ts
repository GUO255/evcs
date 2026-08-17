import type { PlatformPermission } from '@/features/auth/platform-route-permissions'
import {
  getPermittedAgentWorkspaceTabs,
  type AgentWorkspaceTab,
  type AgentWorkspaceView,
} from '@/features/agent-workspace/agent-workspace-permissions'

import {
  getPermittedPlatformManagementNavigation,
  type PlatformManagementPath,
} from './platform-management-navigation'

const AGENT_WORKSPACE_TAB_KEY = 'evcs:agent-workspace:last-tab'
const PLATFORM_MANAGEMENT_PATH_KEY = 'evcs:platform-management:last-path'

export function rememberAgentWorkspaceTab(
  storage: Storage,
  tab: AgentWorkspaceView,
): void {
  storage.setItem(AGENT_WORKSPACE_TAB_KEY, tab)
}

export function getRememberedAgentWorkspaceTab(
  storage: Storage,
  permissions: ReadonlySet<PlatformPermission>,
): AgentWorkspaceView | undefined {
  const storedTab = storage.getItem(AGENT_WORKSPACE_TAB_KEY)
  const permittedTabs = getPermittedAgentWorkspaceTabs(permissions)

  if (storedTab === 'agent-world' && permittedTabs.length > 0) return storedTab

  return permittedTabs.find((tab: AgentWorkspaceTab) => tab === storedTab)
}

export function rememberPlatformManagementPath(
  storage: Storage,
  pathname: string,
  permissions: ReadonlySet<PlatformPermission>,
): void {
  const activePath = getPermittedPlatformManagementNavigation(permissions)
    .flatMap((group) => group.items)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    ?.path

  if (activePath) storage.setItem(PLATFORM_MANAGEMENT_PATH_KEY, activePath)
}

export function getRememberedPlatformManagementPath(
  storage: Storage,
  permissions: ReadonlySet<PlatformPermission>,
): PlatformManagementPath | undefined {
  const storedPath = storage.getItem(PLATFORM_MANAGEMENT_PATH_KEY)
  return getPermittedPlatformManagementNavigation(permissions)
    .flatMap((group) => group.items)
    .find((item) => item.path === storedPath)
    ?.path
}
