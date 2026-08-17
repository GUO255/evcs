import type {
  PointsProduct,
  PointsProductStatus,
  PointsProductType,
} from './points-center-types'

type PointsProductStatusFilter = PointsProductStatus | 'all'

export const initialPointsProducts: readonly PointsProduct[] = [
  {
    id: 'charging-coupon-5',
    imageUrl: '/product-images/charging-coupon.jpg',
    name: '5 元充电优惠券',
    type: 'virtual',
    pointsCost: 500,
    referenceValueCents: 500,
    stock: 999,
    perUserLimit: 5,
    description: '兑换后可抵扣 5 元充电费用。',
    status: 'enabled',
    sortOrder: 1,
  },
  {
    id: 'parking-coupon-30-minutes',
    imageUrl: '/product-images/parking-voucher.jpg',
    name: '30 分钟停车券',
    type: 'virtual',
    pointsCost: 300,
    referenceValueCents: 300,
    stock: 500,
    perUserLimit: 3,
    description: '兑换后可抵扣 30 分钟停车费用。',
    status: 'enabled',
    sortOrder: 2,
  },
  {
    id: 'elephant-thermal-tumbler',
    imageUrl: '/product-images/tumbler.jpg',
    name: '极充智联保温杯',
    type: 'physical',
    pointsCost: 3000,
    referenceValueCents: 5900,
    stock: 80,
    perUserLimit: 1,
    description: '极充智联品牌便携保温杯。',
    status: 'enabled',
    sortOrder: 3,
  },
  {
    id: 'portable-charging-storage-bag',
    imageUrl: '/product-images/charging-storage-bag.jpg',
    name: '便携充电收纳包',
    type: 'physical',
    pointsCost: 1800,
    referenceValueCents: 3900,
    stock: 0,
    perUserLimit: 1,
    description: '便携收纳充电线材与随车小物。',
    status: 'disabled',
    sortOrder: 4,
  },
]

export const pointsProductTypeLabels: Readonly<Record<PointsProductType, string>> = {
  physical: '实物商品',
  virtual: '虚拟权益',
}

export const pointsProductTypeOptions = [
  { label: pointsProductTypeLabels.physical, value: 'physical' },
  { label: pointsProductTypeLabels.virtual, value: 'virtual' },
] as const satisfies readonly { label: string; value: PointsProductType }[]

export const pointsProductStatusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '上架', value: 'enabled' },
  { label: '已下架', value: 'disabled' },
] as const satisfies readonly { label: string; value: PointsProductStatusFilter }[]

const pointsFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
})

const wholeYuanFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPoints(value: number): string {
  return pointsFormatter.format(value)
}

export function formatRmbFromCents(valueInCents: number): string {
  const wholeYuan = Math.floor(valueInCents / 100)
  const remainingCents = valueInCents % 100

  return `${wholeYuanFormatter.format(wholeYuan)}.${String(remainingCents).padStart(2, '0')}`
}
