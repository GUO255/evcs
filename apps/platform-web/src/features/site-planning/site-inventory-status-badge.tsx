import { Badge } from '@/components/ui/badge'

import {
  getSiteInventoryStatusLabel,
  type SiteInventoryStatus,
} from './site-inventory-data'

const statusClassNames: Record<SiteInventoryStatus, string> = {
  incomplete: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  completed: 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-600 dark:text-white',
}

export function SiteInventoryStatusBadge({ status }: { status: SiteInventoryStatus }) {
  return (
    <Badge
      variant={status === 'incomplete' ? 'outline' : 'default'}
      className={statusClassNames[status]}
    >
      {getSiteInventoryStatusLabel(status)}
    </Badge>
  )
}
