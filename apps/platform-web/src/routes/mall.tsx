import { createFileRoute } from '@tanstack/react-router'

import { MallPage } from '@/features/mall/mall-page'

export const Route = createFileRoute('/mall')({
  component: MallPage,
})
