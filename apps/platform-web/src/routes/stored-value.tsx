import { createFileRoute } from '@tanstack/react-router'

import { StoredValuePage } from '@/features/stored-value/stored-value-page'

export const Route = createFileRoute('/stored-value')({
  component: StoredValuePage,
})
