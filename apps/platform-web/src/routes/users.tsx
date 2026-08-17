import { createFileRoute } from '@tanstack/react-router'

import { UserListPage } from '@/features/mini-program-users/user-list-page'

export const Route = createFileRoute('/users')({
  component: UserListPage,
})
