import { createFileRoute, notFound } from '@tanstack/react-router'

import {
  MembershipRecordDetailPage,
  type MembershipResourceType,
} from '@/features/membership-config/membership-record-detail-page'

const resourceTypes = new Set<MembershipResourceType>(['products', 'benefits', 'prices'])

export const Route = createFileRoute('/membership-config_/$resourceType/$recordId')({
  component: MembershipRecordDetailRoute,
})

function MembershipRecordDetailRoute() {
  const { resourceType, recordId } = Route.useParams()
  if (!resourceTypes.has(resourceType as MembershipResourceType)) throw notFound()
  return (
    <MembershipRecordDetailPage
      resourceType={resourceType as MembershipResourceType}
      recordId={recordId}
    />
  )
}
