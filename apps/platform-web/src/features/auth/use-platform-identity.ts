import { useQuery } from '@tanstack/react-query'

import { authenticatedFetch, platformGatewayBase } from '@/auth/browser-auth-client'

import type { PlatformPermission } from './platform-route-permissions'
import {
  parsePlatformIdentity,
  PlatformApiError,
  platformIdentityQueryKey,
  type PlatformIdentity as ParsedPlatformIdentity,
} from './platform-identity-query'

export { PlatformApiError } from './platform-identity-query'

export interface PlatformIdentity extends Omit<ParsedPlatformIdentity, 'permissions'> {
  permissions: readonly PlatformPermission[]
  permissionSet: ReadonlySet<PlatformPermission>
}

async function loadIdentity(): Promise<PlatformIdentity> {
  const response = await authenticatedFetch(`${platformGatewayBase}/api/me`)
  if (!response.ok) throw new PlatformApiError(response.status)

  try {
    const identity = parsePlatformIdentity(await response.json())
    return {
      ...identity,
      permissions: identity.permissions,
      permissionSet: new Set(identity.permissions),
    }
  } catch (error) {
    if (error instanceof PlatformApiError) throw error
    throw new PlatformApiError(502, 'malformed_response', '平台服务返回了无效身份数据，请稍后重试。')
  }
}

export function usePlatformIdentity() {
  return useQuery({
    queryKey: platformIdentityQueryKey,
    queryFn: loadIdentity,
    retry: (failureCount, error) => {
      if (error instanceof PlatformApiError && [401, 403].includes(error.status)) return false
      return failureCount < 2
    },
    staleTime: 60_000,
  })
}
