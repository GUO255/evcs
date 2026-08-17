import { createFileRoute } from '@tanstack/react-router'

import { PointsCenterPage } from '@/features/points-center/points-center-page'

export const Route = createFileRoute('/points-center')({
  component: PointsCenterPage,
})
