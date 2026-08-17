import { createFileRoute } from '@tanstack/react-router'

import { MembershipConfigPage } from '@/features/membership-config/membership-config-page'

export const Route = createFileRoute('/membership-config')({
  component: MembershipConfigPage,
})
