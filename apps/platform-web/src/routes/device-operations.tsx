import { createFileRoute, Outlet } from '@tanstack/react-router'

import { DeviceOperationsProvider } from '@/features/device-operations/device-operations-store'

export const Route = createFileRoute('/device-operations')({
  component: DeviceOperationsLayout,
})

function DeviceOperationsLayout() {
  return <DeviceOperationsProvider><Outlet /></DeviceOperationsProvider>
}
