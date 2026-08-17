import { createFileRoute } from '@tanstack/react-router'

import { StoredValueConfigPage } from '@/features/stored-value-config/stored-value-config-page'

export const Route = createFileRoute('/stored-value-config')({
  component: StoredValueConfigPage,
})
