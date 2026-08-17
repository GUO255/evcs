import { Badge } from '@/components/ui/badge'

import {
  getSiteExplorationStatusConfig,
  type SiteExplorationStatus,
} from './site-exploration-status-config'

export function SiteExplorationStatusBadge({
  status,
  completed,
  total,
}: {
  status: SiteExplorationStatus
  completed?: number
  total?: number
}) {
  const config = getSiteExplorationStatusConfig(status)
  const progress = status !== 'completed'
    && status !== 'signed'
    && completed !== undefined
    && total !== undefined
    ? `${completed}/${total}`
    : ''

  return (
    <Badge
      variant="default"
      className="border-transparent"
      style={{ backgroundColor: config.color, color: config.foregroundColor }}
    >
      {config.label}{progress ? ` ${progress}` : ''}
    </Badge>
  )
}
