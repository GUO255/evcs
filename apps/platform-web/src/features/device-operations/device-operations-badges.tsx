import { Badge } from '@/components/ui/badge'

import {
  getAlertLevelLabel,
  getAlertStatusLabel,
  getWorkOrderStatusLabel,
  type AlertLevel,
  type AlertStatus,
  type WorkOrderStatus,
} from './device-operations-data'

export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  const variant = level === 'critical' ? 'destructive' : level === 'major' ? 'secondary' : 'outline'
  return <Badge variant={variant}>{getAlertLevelLabel(level)}</Badge>
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const variant = status === 'pending' ? 'destructive' : status === 'dispatched' ? 'secondary' : 'default'
  return <Badge variant={variant}>{getAlertStatusLabel(status)}</Badge>
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const variant = status === 'pending-acceptance' ? 'secondary' : status === 'processing' ? 'default' : 'outline'
  return <Badge variant={variant}>{getWorkOrderStatusLabel(status)}</Badge>
}
