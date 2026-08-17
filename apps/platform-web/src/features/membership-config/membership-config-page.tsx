import { useState } from 'react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { MembershipBenefitsSection } from './membership-benefits-section'
import {
  createMembershipBenefit,
  createMembershipProduct,
  createMembershipStationPrice,
  deleteMembershipBenefit,
  deleteMembershipProduct,
  deleteMembershipStationPrice,
  moveMembershipBenefit,
  moveMembershipProduct,
  moveMembershipStationPrice,
  toggleMembershipBenefit,
  toggleMembershipProduct,
  toggleMembershipStationPrice,
  useMembershipConfig,
} from './membership-config-store'
import { MembershipDeleteDialog } from './membership-delete-dialog'
import { MembershipPricesSection } from './membership-prices-section'
import { MembershipProductsSection } from './membership-products-section'
import type {
  MembershipBenefit,
  MembershipProduct,
  MembershipStationPrice,
} from './membership-config-types'

type MembershipDeleteTarget =
  | { kind: 'product'; record: MembershipProduct }
  | { kind: 'benefit'; record: MembershipBenefit }
  | { kind: 'price'; record: MembershipStationPrice }


function deleteTargetName(target: MembershipDeleteTarget | undefined) {
  if (!target) {
    return ''
  }

  return target.kind === 'price' ? target.record.stationName : target.record.name
}

export function MembershipConfigPage() {
  const { products, benefits, stationPrices } = useMembershipConfig()
  const [deleteTarget, setDeleteTarget] = useState<MembershipDeleteTarget>()

  function requestProductDelete(product: MembershipProduct) {
    setDeleteTarget({ kind: 'product', record: product })
  }

  function requestBenefitDelete(benefit: MembershipBenefit) {
    setDeleteTarget({ kind: 'benefit', record: benefit })
  }

  function requestStationPriceDelete(price: MembershipStationPrice) {
    setDeleteTarget({ kind: 'price', record: price })
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    const deletedRecordName = deleteTargetName(deleteTarget)

    switch (deleteTarget.kind) {
      case 'product':
        deleteMembershipProduct(deleteTarget.record.id)
        break
      case 'benefit':
        deleteMembershipBenefit(deleteTarget.record.id)
        break
      case 'price':
        deleteMembershipStationPrice(deleteTarget.record.id)
        break
    }

    setDeleteTarget(undefined)
    toast.success(`“${deletedRecordName}”已删除`)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">会员配置</h1>
        <p className="text-sm text-muted-foreground">
          配置小程序会员商品、会员权益及会员专享价展示内容。
        </p>
      </header>

      <Tabs defaultValue="products" className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          <TabsTrigger value="products">会员商品</TabsTrigger>
          <TabsTrigger value="benefits">会员权益</TabsTrigger>
          <TabsTrigger value="prices">专享价配置</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <MembershipProductsSection
            products={products}
            onCreate={createMembershipProduct}
            onToggle={toggleMembershipProduct}
            onMove={moveMembershipProduct}
            onDelete={requestProductDelete}
          />
        </TabsContent>
        <TabsContent value="benefits">
          <MembershipBenefitsSection
            benefits={benefits}
            onCreate={createMembershipBenefit}
            onToggle={toggleMembershipBenefit}
            onMove={moveMembershipBenefit}
            onDelete={requestBenefitDelete}
          />
        </TabsContent>
        <TabsContent value="prices">
          <MembershipPricesSection
            prices={stationPrices}
            onCreate={createMembershipStationPrice}
            onToggle={toggleMembershipStationPrice}
            onMove={moveMembershipStationPrice}
            onDelete={requestStationPriceDelete}
          />
        </TabsContent>
      </Tabs>

      <MembershipDeleteDialog
        open={Boolean(deleteTarget)}
        recordName={deleteTargetName(deleteTarget)}
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
