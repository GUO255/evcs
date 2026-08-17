import { createFileRoute, Navigate } from '@tanstack/react-router'

import { ForbiddenPage } from '@/features/auth/forbidden-page'
import { usePlatformIdentity } from '@/features/auth/use-platform-identity'

export const Route = createFileRoute('/access-control/')({
  component: AccessControlIndex,
})

function AccessControlIndex() {
  const identity = usePlatformIdentity()
  const permissions = identity.data?.permissionSet

  if (permissions?.has('platform-users.manage')) {
    return <Navigate to="/access-control/platform-users" replace />
  }
  if (permissions?.has('roles.manage')) {
    return <Navigate to="/access-control/roles" replace />
  }
  return <ForbiddenPage />
}
