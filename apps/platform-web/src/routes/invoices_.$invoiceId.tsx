import { createFileRoute } from '@tanstack/react-router'

import { InvoiceDetailPage } from '@/features/invoices/invoice-detail-page'

export const Route = createFileRoute('/invoices_/$invoiceId')({
  component: InvoiceDetailRoute,
})

function InvoiceDetailRoute() {
  const { invoiceId } = Route.useParams()
  return <InvoiceDetailPage invoiceId={invoiceId} />
}
