import { useState } from 'react'
import { toast } from 'sonner'

import { MallProductDeleteDialog } from './mall-product-delete-dialog'
import { MallProductsSection } from './mall-products-section'
import {
  createMallProduct,
  deleteMallProduct,
  moveMallProduct,
  toggleMallProduct,
  useMallProducts,
} from './mall-products-store'
import type { MallProduct } from './mall-types'

export function MallPage() {
  const products = useMallProducts()
  const [deleteTarget, setDeleteTarget] = useState<MallProduct>()

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    const deletedProductName = deleteTarget.name
    deleteMallProduct(deleteTarget.id)
    setDeleteTarget(undefined)
    toast.success(`“${deletedProductName}”已删除`)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">商城配置</h1>
        <p className="text-sm text-muted-foreground">
          管理商城商品及其展示、库存和销售状态。
        </p>
      </header>
      <MallProductsSection
        products={products}
        onCreate={createMallProduct}
        onToggle={toggleMallProduct}
        onMove={moveMallProduct}
        onDelete={setDeleteTarget}
      />
      <MallProductDeleteDialog
        open={Boolean(deleteTarget)}
        productName={deleteTarget?.name ?? ''}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(undefined)
          }
        }}
        onConfirm={confirmDelete}
      />
    </section>
  )
}
