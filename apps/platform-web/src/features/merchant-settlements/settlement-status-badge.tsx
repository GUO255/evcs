import { Badge } from '@/components/ui/badge'

import { getSettlementStatusLabel, type SettlementStatus } from './settlement-data'

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const variant = status === 'settled'
    ? 'default'
    : status === 'failed'
      ? 'destructive'
      : 'secondary'

  return <Badge variant={variant}>{getSettlementStatusLabel(status)}</Badge>
}
