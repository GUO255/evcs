export type MallProductKind = 'physical' | 'virtual'
export type MallProductCategory =
  | 'charging-accessory'
  | 'vehicle-life'
  | 'coupon'
export type MallProductStatus = 'enabled' | 'disabled'

export interface MallProduct {
  id: string
  imageUrl: string
  sku: string
  name: string
  kind: MallProductKind
  category: MallProductCategory
  priceCents: number
  compareAtPriceCents: number
  stock: number
  salesCount: number
  description: string
  status: MallProductStatus
  sortOrder: number
}

export type MallProductInput = Omit<
  MallProduct,
  'id' | 'salesCount' | 'sortOrder'
>

export type MallOrderStatus =
  | 'pending-payment'
  | 'paid'
  | 'to-ship'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export type PaymentMethod = 'wechat' | 'balance'

export interface MallReceiver {
  name: string
  maskedMobile: string
  address: string
}

export interface MallTracking {
  company: string
  trackingNo: string
}

export interface MallOrder {
  id: string
  orderNo: string
  buyerName: string
  maskedMobile: string
  productName: string
  sku: string
  quantity: number
  totalAmountCents: number
  status: MallOrderStatus
  createdAt: string
  paymentMethod: PaymentMethod
  receiver: MallReceiver | null
  tracking: MallTracking | null
}
