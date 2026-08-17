import { describe, expect, test } from 'bun:test'

import {
  getPermittedAgentWorkspaceTabs,
  resolveAgentWorkspaceAccess,
} from '../../src/features/agent-workspace/agent-workspace-permissions'
import type { PlatformPermission } from '../../src/features/auth/platform-route-permissions'

function permissions(...values: PlatformPermission[]): ReadonlySet<PlatformPermission> {
  return new Set(values)
}

describe('agent workspace permissions', () => {
  test('preserves the registered workspace order when filtering tabs', () => {
    expect(getPermittedAgentWorkspaceTabs(permissions(
      'agents.refund-analysis.use',
      'agents.inspection.use',
      'agents.business-analysis.use',
    ))).toEqual(['inspection', 'business-analysis'])
  })

  test('redirects absent and unknown tabs to the first permitted workspace', () => {
    const granted = permissions('agents.site-selection.use')

    expect(resolveAgentWorkspaceAccess(undefined, granted)).toEqual({ kind: 'redirect', tab: 'site-selection' })
    expect(resolveAgentWorkspaceAccess('unknown', granted)).toEqual({ kind: 'redirect', tab: 'site-selection' })
  })

  test('forbids a registered workspace without its permission', () => {
    expect(resolveAgentWorkspaceAccess('inspection', permissions('agents.site-selection.use'))).toEqual({ kind: 'forbidden' })
  })

  test('allows a permitted workspace and returns the filtered sidebar tabs', () => {
    expect(resolveAgentWorkspaceAccess('site-selection', permissions('agents.site-selection.use'))).toEqual({
      kind: 'allowed',
      tab: 'site-selection',
      permittedTabs: ['site-selection'],
    })
  })

  test('rejects resolver use when the root route has no agent permission', () => {
    expect(() => resolveAgentWorkspaceAccess(undefined, permissions('maintenance.manage'))).toThrow('agent_workspace_permission_invariant')
  })
})
