import { useState } from 'react'
import { toast } from 'sonner'

import { PointsProductDeleteDialog } from './points-product-delete-dialog'
import { PointsProductsSection } from './points-products-section'
import {
  createPointsProduct,
  deletePointsProduct,
  movePointsProduct,
  togglePointsProduct,
  usePointsProducts,
} from './points-products-store'
import type { PointsProduct } from './points-center-types'

export function PointsCenterPage() {
  const products = usePointsProducts()
  const [deleteTarget, setDeleteTarget] = useState<PointsProduct>()

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    const deletedProductName = deleteTarget.name
    deletePointsProduct(deleteTarget.id)
    setDeleteTarget(undefined)
    toast.success(`“${deletedProductName}”已删除`)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">积分中心配置</h1>
        <p className="text-sm text-muted-foreground">
          配置小程序积分兑换商品及展示信息。
        </p>
      </header>
      <PointsProductsSection
        products={products}
        onCreate={createPointsProduct}
        onToggle={togglePointsProduct}
        onMove={movePointsProduct}
        onDelete={setDeleteTarget}
      />
      <PointsProductDeleteDialog
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
