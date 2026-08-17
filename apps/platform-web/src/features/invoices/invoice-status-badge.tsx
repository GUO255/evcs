import { Badge } from '@/components/ui/badge'

import { getInvoiceStatusLabel, type InvoiceStatus } from './invoice-data'

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const variant = status === 'issued'
    ? 'default'
    : status === 'rejected'
      ? 'destructive'
      : 'secondary'

  return <Badge variant={variant}>{getInvoiceStatusLabel(status)}</Badge>
}
