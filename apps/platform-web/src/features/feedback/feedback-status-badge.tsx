import { Badge } from '@/components/ui/badge'

import type { FeedbackStatus } from './feedback-data'

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <Badge variant={status === 'replied' ? 'default' : 'destructive'}>
      {status === 'replied' ? '已回复' : '待回复'}
    </Badge>
  )
}
