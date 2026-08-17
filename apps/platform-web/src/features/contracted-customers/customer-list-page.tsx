import { useCallback, useState } from 'react'
import { PlusIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'

import type { Customer } from './customer-data'
import { CustomerDataTable } from './customer-data-table'
import { CustomerDeleteDialog } from './customer-delete-dialog'
import { CustomerFormDialog } from './customer-form-dialog'
import { useCustomers } from './customer-store'

export function CustomerListPage() {
  const { customers, deleteCustomer } = useCustomers()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer>()
  const [deletingCustomer, setDeletingCustomer] = useState<Customer>()

  const editCustomer = useCallback((customer: Customer) => {
    setEditingCustomer(customer)
    setFormOpen(true)
  }, [])

  const requestDelete = useCallback((customer: Customer) => {
    setDeletingCustomer(customer)
  }, [])

  function changeFormOpen(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingCustomer(undefined)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">签约客户管理</h1>
          <p className="text-sm text-muted-foreground">维护车队与企业客户资料、联系人及合同有效期。</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          新增客户
        </Button>
      </header>

      <CustomerDataTable customers={customers} onEdit={editCustomer} onDelete={requestDelete} />

      <CustomerFormDialog open={formOpen} customer={editingCustomer} onOpenChange={changeFormOpen} />
      <CustomerDeleteDialog
        open={Boolean(deletingCustomer)}
        customerName={deletingCustomer?.customerName ?? ''}
        onOpenChange={(open) => {
          if (!open) setDeletingCustomer(undefined)
        }}
        onConfirm={() => {
          if (deletingCustomer) deleteCustomer(deletingCustomer.id)
        }}
      />
    </section>
  )
}
