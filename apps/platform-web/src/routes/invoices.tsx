import { createFileRoute } from '@tanstack/react-router'

import { InvoicePage } from '@/features/invoices/invoice-page'

export const Route = createFileRoute('/invoices')({
  component: InvoicePage,
})
