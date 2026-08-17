import { describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'

import {
  clearPlatformIdentity,
  parsePlatformIdentity,
  platformIdentityQueryKey,
} from '../../src/features/auth/platform-identity-query'

describe('platform identity query ownership', () => {
  test('accepts a platform member without an optional email', () => {
    const identity = parsePlatformIdentity({
      authUserId: '7e4dc52a-0000-4000-8000-000000000000',
      authDomain: 'platform',
      clientId: 'platform-web-bff',
      scopes: ['platform:read'],
      member: { id: '3', code: 'PU000003', realName: '平台用户', phoneNumber: '+8618611685671', email: null, protected: false },
      roles: [{ id: '3', code: 'R000003', displayName: '运维' }],
      permissions: ['monitoring.view'],
    })

    expect(identity.member.email).toBeNull()
    expect(identity.member.phoneNumber).toBe('+8618611685671')
  })

  test('removes account A before account B identity can be rendered', () => {
    const client = new QueryClient()
    client.setQueryData(platformIdentityQueryKey, { authUserId: 'account-a' })

    clearPlatformIdentity(client)

    expect(client.getQueryData(platformIdentityQueryKey)).toBeUndefined()
    client.setQueryData(platformIdentityQueryKey, { authUserId: 'account-b' })
    expect(client.getQueryData(platformIdentityQueryKey)).toEqual({ authUserId: 'account-b' })
  })
})
