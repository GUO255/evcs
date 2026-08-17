import { createFileRoute } from '@tanstack/react-router'

import { AccessControlPage } from '@/features/access-control/access-control-page'

export const Route = createFileRoute('/access-control')({
  component: AccessControlPage,
})
