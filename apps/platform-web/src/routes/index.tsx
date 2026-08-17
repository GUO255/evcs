import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ForbiddenPage } from '@/features/auth/forbidden-page'
import { usePlatformIdentity } from '@/features/auth/use-platform-identity'
import { getFirstPermittedPlatformPath } from '@/features/product-shell/platform-management-navigation'

export const Route = createFileRoute('/')({
  component: PlatformLanding,
})

function PlatformLanding() {
  const navigate = useNavigate()
  const identity = usePlatformIdentity()
  const destination = identity.data ? getFirstPermittedPlatformPath(identity.data.permissionSet) : undefined

  useEffect(() => {
    if (destination) void navigate({ to: destination, replace: true })
  }, [destination, navigate])

  if (identity.data && !destination) return <ForbiddenPage />
  return <section className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">正在进入可访问的工作区…</section>
}
