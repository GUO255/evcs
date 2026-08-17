import { createFileRoute } from '@tanstack/react-router'

import { PlatformUserList } from '@/features/access-control/platform-user-list'

export const Route = createFileRoute('/access-control/platform-users')({
  component: PlatformUserList,
})
