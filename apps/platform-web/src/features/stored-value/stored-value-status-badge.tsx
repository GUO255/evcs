import { Badge } from '@/components/ui/badge'

import {
  getStoredValueStatusLabel,
  type StoredValueTransactionStatus,
} from './stored-value-data'

export function StoredValueStatusBadge({ status }: { status: StoredValueTransactionStatus }) {
  const variant = status === 'success'
    ? 'default'
    : status === 'failed'
      ? 'destructive'
      : 'secondary'

  return <Badge variant={variant}>{getStoredValueStatusLabel(status)}</Badge>
}
