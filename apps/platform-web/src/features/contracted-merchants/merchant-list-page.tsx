import { useCallback, useState } from 'react'
import { PlusIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'

import type { Merchant } from './merchant-data'
import { MerchantDataTable } from './merchant-data-table'
import { MerchantDeleteDialog } from './merchant-delete-dialog'
import { MerchantFormDialog } from './merchant-form-dialog'
import { useMerchants } from './merchant-store'

export function MerchantListPage() {
  const { merchants, deleteMerchant } = useMerchants()
  const [formOpen, setFormOpen] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState<Merchant>()
  const [deletingMerchant, setDeletingMerchant] = useState<Merchant>()

  const editMerchant = useCallback((merchant: Merchant) => {
    setEditingMerchant(merchant)
    setFormOpen(true)
  }, [])

  const requestDelete = useCallback((merchant: Merchant) => {
    setDeletingMerchant(merchant)
  }, [])

  function changeFormOpen(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingMerchant(undefined)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">签约商户管理</h1>
          <p className="text-sm text-muted-foreground">维护合作企业资料、联系人与合同有效期。</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          新增商户
        </Button>
      </header>

      <MerchantDataTable merchants={merchants} onEdit={editMerchant} onDelete={requestDelete} />

      <MerchantFormDialog open={formOpen} merchant={editingMerchant} onOpenChange={changeFormOpen} />
      <MerchantDeleteDialog
        open={Boolean(deletingMerchant)}
        merchantName={deletingMerchant?.companyName ?? ''}
        onOpenChange={(open) => {
          if (!open) setDeletingMerchant(undefined)
        }}
        onConfirm={() => {
          if (deletingMerchant) deleteMerchant(deletingMerchant.id)
        }}
      />
    </section>
  )
}
