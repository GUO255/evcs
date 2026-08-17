import { createFileRoute } from '@tanstack/react-router'

import { DeviceOperationsPage } from '@/features/device-operations/device-operations-page'

export const Route = createFileRoute('/device-operations/')({
  component: DeviceOperationsPage,
})
