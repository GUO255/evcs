import { createFileRoute } from '@tanstack/react-router'

import { RoleList } from '@/features/access-control/role-list'

export const Route = createFileRoute('/access-control/roles')({
  component: RoleList,
})
