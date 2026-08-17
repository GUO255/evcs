import type {
  MallOrder,
  MallOrderStatus,
  MallProduct,
  MallProductCategory,
  MallProductKind,
  MallProductStatus,
  PaymentMethod,
} from './mall-types'

type MallProductKindFilter = MallProductKind | 'all'
type MallProductCategoryFilter = MallProductCategory | 'all'
type MallProductStatusFilter = MallProductStatus | 'all'
type MallOrderStatusFilter = MallOrderStatus | 'all'

export const initialMallProducts: readonly MallProduct[] = [
  {
    id: 'mall-product-1001',
    imageUrl: '/product-images/trunk-organizer.jpg',
    sku: 'MALL-1001',
    name: '极充智联车载收纳箱',
    kind: 'physical',
    category: 'vehicle-life',
    priceCents: 8900,
    compareAtPriceCents: 12900,
    stock: 32,
    salesCount: 186,
    description: '可折叠设计，便于整理后备箱随车物品。',
    status: 'enabled',
    sortOrder: 1,
  },
  {
    id: 'mall-product-1002',
    imageUrl: '/product-images/charging-storage-bag.jpg',
    sku: 'MALL-1002',
    name: '便携式充电枪收纳包',
    kind: 'physical',
    category: 'charging-accessory',
    priceCents: 3990,
    compareAtPriceCents: 5900,
    stock: 8,
    salesCount: 342,
    description: '防泼水加厚收纳，适配便携式充电枪。',
    status: 'enabled',
    sortOrder: 2,
  },
  {
    id: 'mall-product-1003',
    imageUrl: '/product-images/tumbler.jpg',
    sku: 'MALL-1003',
    name: '极充智联保温杯',
    kind: 'physical',
    category: 'vehicle-life',
    priceCents: 5900,
    compareAtPriceCents: 7900,
    stock: 0,
    salesCount: 97,
    description: '双层真空保温，适合日常随车使用。',
    status: 'disabled',
    sortOrder: 3,
  },
  {
    id: 'mall-product-2001',
    imageUrl: '/product-images/charging-coupon.jpg',
    sku: 'MALL-2001',
    name: '10 元充电优惠券',
    kind: 'virtual',
    category: 'coupon',
    priceCents: 880,
    compareAtPriceCents: 1000,
    stock: 9999,
    salesCount: 1280,
    description: '购买后发放至账户，可抵扣充电费用。',
    status: 'enabled',
    sortOrder: 4,
  },
  {
    id: 'mall-product-2002',
    imageUrl: '/product-images/parking-voucher.jpg',
    sku: 'MALL-2002',
    name: '2 小时停车权益券',
    kind: 'virtual',
    category: 'coupon',
    priceCents: 600,
    compareAtPriceCents: 800,
    stock: 500,
    salesCount: 420,
    description: '购买后发放至账户，可兑换 2 小时停车权益。',
    status: 'enabled',
    sortOrder: 5,
  },
]

export const initialMallOrders: readonly MallOrder[] = [
  {
    id: 'mall-order-001',
    orderNo: 'M202607240001',
    buyerName: '林悦',
    maskedMobile: '138****2601',
    productName: '极充智联车载收纳箱',
    sku: 'MALL-1001',
    quantity: 1,
    totalAmountCents: 8900,
    status: 'to-ship',
    createdAt: '2026-07-24T09:18:00+08:00',
    paymentMethod: 'wechat',
    receiver: {
      name: '林悦',
      maskedMobile: '138****2601',
      address: '河南省郑州市金水区花园路 88 号',
    },
    tracking: null,
  },
  {
    id: 'mall-order-002',
    orderNo: 'M202607230018',
    buyerName: '王磊',
    maskedMobile: '156****7318',
    productName: '便携式充电枪收纳包',
    sku: 'MALL-1002',
    quantity: 2,
    totalAmountCents: 7980,
    status: 'shipped',
    createdAt: '2026-07-23T16:42:00+08:00',
    paymentMethod: 'balance',
    receiver: {
      name: '王磊',
      maskedMobile: '156****7318',
      address: '河南省洛阳市洛龙区开元大道 260 号',
    },
    tracking: {
      company: '顺丰速运',
      trackingNo: 'SF1548362907518',
    },
  },
  {
    id: 'mall-order-003',
    orderNo: 'M202607230009',
    buyerName: '陈晨',
    maskedMobile: '187****4026',
    productName: '10 元充电优惠券',
    sku: 'MALL-2001',
    quantity: 2,
    totalAmountCents: 1760,
    status: 'completed',
    createdAt: '2026-07-23T11:07:00+08:00',
    paymentMethod: 'wechat',
    receiver: null,
    tracking: null,
  },
  {
    id: 'mall-order-004',
    orderNo: 'M202607220026',
    buyerName: '何佳',
    maskedMobile: '135****9184',
    productName: '极充智联保温杯',
    sku: 'MALL-1003',
    quantity: 1,
    totalAmountCents: 5900,
    status: 'pending-payment',
    createdAt: '2026-07-22T20:31:00+08:00',
    paymentMethod: 'wechat',
    receiver: {
      name: '何佳',
      maskedMobile: '135****9184',
      address: '河南省开封市龙亭区东京大道 36 号',
    },
    tracking: null,
  },
  {
    id: 'mall-order-005',
    orderNo: 'M202607220011',
    buyerName: '许婧',
    maskedMobile: '139****6452',
    productName: '2 小时停车权益券',
    sku: 'MALL-2002',
    quantity: 1,
    totalAmountCents: 600,
    status: 'paid',
    createdAt: '2026-07-22T10:24:00+08:00',
    paymentMethod: 'balance',
    receiver: null,
    tracking: null,
  },
  {
    id: 'mall-order-006',
    orderNo: 'M202607210033',
    buyerName: '周宁',
    maskedMobile: '158****1739',
    productName: '极充智联车载收纳箱',
    sku: 'MALL-1001',
    quantity: 1,
    totalAmountCents: 8900,
    status: 'cancelled',
    createdAt: '2026-07-21T18:56:00+08:00',
    paymentMethod: 'balance',
    receiver: {
      name: '周宁',
      maskedMobile: '158****1739',
      address: '河南省新乡市红旗区平原路 128 号',
    },
    tracking: null,
  },
  {
    id: 'mall-order-007',
    orderNo: 'M202607200015',
    buyerName: '秦越',
    maskedMobile: '176****5097',
    productName: '便携式充电枪收纳包',
    sku: 'MALL-1002',
    quantity: 1,
    totalAmountCents: 3990,
    status: 'completed',
    createdAt: '2026-07-20T14:13:00+08:00',
    paymentMethod: 'wechat',
    receiver: {
      name: '秦越',
      maskedMobile: '176****5097',
      address: '河南省许昌市魏都区莲城大道 99 号',
    },
    tracking: {
      company: '中通快递',
      trackingNo: '78645201937465',
    },
  },
  {
    id: 'mall-order-008',
    orderNo: 'M202607190008',
    buyerName: '杨帆',
    maskedMobile: '132****8643',
    productName: '10 元充电优惠券',
    sku: 'MALL-2001',
    quantity: 3,
    totalAmountCents: 2640,
    status: 'to-ship',
    createdAt: '2026-07-19T08:46:00+08:00',
    paymentMethod: 'wechat',
    receiver: null,
    tracking: null,
  },
]

export const mallProductKindLabels: Readonly<Record<MallProductKind, string>> = {
  physical: '实物商品',
  virtual: '虚拟商品',
}

export const mallProductCategoryLabels: Readonly<
  Record<MallProductCategory, string>
> = {
  'charging-accessory': '充电周边',
  'vehicle-life': '车生活',
  coupon: '优惠权益',
}

export const mallProductStatusLabels: Readonly<
  Record<MallProductStatus, string>
> = {
  enabled: '在售',
  disabled: '已下架',
}

export const mallOrderStatusLabels: Readonly<Record<MallOrderStatus, string>> = {
  'pending-payment': '待支付',
  paid: '已支付',
  'to-ship': '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

export const mallPaymentMethodLabels: Readonly<Record<PaymentMethod, string>> = {
  wechat: '微信支付',
  balance: '余额支付',
}

export const mallProductKindFilterOptions = [
  { label: '全部', value: 'all' },
  { label: mallProductKindLabels.physical, value: 'physical' },
  { label: mallProductKindLabels.virtual, value: 'virtual' },
] as const satisfies readonly { label: string; value: MallProductKindFilter }[]

export const mallProductCategoryFilterOptions = [
  { label: '全部', value: 'all' },
  { label: mallProductCategoryLabels['charging-accessory'], value: 'charging-accessory' },
  { label: mallProductCategoryLabels['vehicle-life'], value: 'vehicle-life' },
  { label: mallProductCategoryLabels.coupon, value: 'coupon' },
] as const satisfies readonly { label: string; value: MallProductCategoryFilter }[]

export const mallProductStatusFilterOptions = [
  { label: '全部', value: 'all' },
  { label: mallProductStatusLabels.enabled, value: 'enabled' },
  { label: mallProductStatusLabels.disabled, value: 'disabled' },
] as const satisfies readonly { label: string; value: MallProductStatusFilter }[]

export const mallOrderStatusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: mallOrderStatusLabels['pending-payment'], value: 'pending-payment' },
  { label: mallOrderStatusLabels.paid, value: 'paid' },
  { label: mallOrderStatusLabels['to-ship'], value: 'to-ship' },
  { label: mallOrderStatusLabels.shipped, value: 'shipped' },
  { label: mallOrderStatusLabels.completed, value: 'completed' },
  { label: mallOrderStatusLabels.cancelled, value: 'cancelled' },
] as const satisfies readonly { label: string; value: MallOrderStatusFilter }[]

const wholeYuanFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

export function formatMallCurrency(valueInCents: number): string {
  if (!Number.isSafeInteger(valueInCents)) {
    throw new RangeError('商城金额必须为安全整数分')
  }

  const absoluteCents = Math.abs(valueInCents)
  const wholeYuan = Math.floor(absoluteCents / 100)
  const remainingCents = absoluteCents % 100
  const sign = valueInCents < 0 ? '-' : ''

  return `${sign}${wholeYuanFormatter.format(wholeYuan)}.${String(remainingCents).padStart(2, '0')}`
}

export function formatMallDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}
