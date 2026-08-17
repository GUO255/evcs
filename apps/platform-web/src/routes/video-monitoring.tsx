import { createFileRoute } from '@tanstack/react-router'

import { VideoMonitoringPage } from '@/features/video-monitoring/video-monitoring-page'

export const Route = createFileRoute('/video-monitoring')({
  component: VideoMonitoringPage,
})
