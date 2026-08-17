import { Badge } from '@/components/ui/badge'

import {
  getChargingOrderStatusLabel,
  getPaymentStatusLabel,
  type ChargingOrderStatus,
  type PaymentStatus,
} from './order-data'

export function ChargingOrderStatusBadge({ status }: { status: ChargingOrderStatus }) {
  const variant = status === 'charging'
    ? 'default'
    : status === 'pending-payment'
      ? 'destructive'
      : status === 'completed'
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{getChargingOrderStatusLabel(status)}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant = status === 'paid' ? 'secondary' : status === 'unpaid' ? 'destructive' : 'outline'
  return <Badge variant={variant}>{getPaymentStatusLabel(status)}</Badge>
}
