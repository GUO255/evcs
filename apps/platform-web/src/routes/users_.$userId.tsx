import { createFileRoute } from '@tanstack/react-router'

import { UserDetailPage } from '@/features/mini-program-users/user-detail-page'

export const Route = createFileRoute('/users_/$userId')({
  component: UserDetailRoute,
})

function UserDetailRoute() {
  const { userId } = Route.useParams()
  return <UserDetailPage userId={userId} />
}
