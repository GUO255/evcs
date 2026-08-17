import { createFileRoute } from '@tanstack/react-router'

import { RatePage } from '@/features/rates/rate-page'

export const Route = createFileRoute('/rates')({
  component: RatePage,
})
