export type PointsOrderStatus = 'pending' | 'completed' | 'cancelled' | 'failed'
export type PointsProductType = 'physical' | 'virtual'

export interface PointsOrder {
  id: string
  orderCode: string
  createdAt: string
  userName: string
  maskedMobile: string
  productName: string
  productType: PointsProductType
  quantity: number
  pointsCost: number
  status: PointsOrderStatus
  fulfillmentMethod: string
  recipient: string | null
  recipientMobile: string | null
  address: string | null
  fulfilledAt: string | null
  remark: string
}

export const pointsOrderStatusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'failed', label: '兑换失败' },
] as const satisfies readonly { value: PointsOrderStatus; label: string }[]

export const pointsProductTypeLabels: Readonly<Record<PointsProductType, string>> = {
  physical: '实物商品',
  virtual: '虚拟权益',
}

const pointsOrders: readonly PointsOrder[] = [
  { id: 'points-order-001', orderCode: 'JF202607240018', createdAt: '2026-07-24T10:18:00+08:00', userName: '一路向南', maskedMobile: '138****2101', productName: '极充智联保温杯', productType: 'physical', quantity: 1, pointsCost: 3200, status: 'pending', fulfillmentMethod: '快递配送', recipient: '林悦', recipientMobile: '138****2101', address: '河南省郑州市金水区花园路 88 号', fulfilledAt: null, remark: '等待仓库出库。' },
  { id: 'points-order-002', orderCode: 'JF202607230026', createdAt: '2026-07-23T16:42:00+08:00', userName: '小白车主', maskedMobile: '139****3722', productName: '10 元充电优惠券', productType: 'virtual', quantity: 1, pointsCost: 800, status: 'completed', fulfillmentMethod: '自动发放至账户', recipient: null, recipientMobile: null, address: null, fulfilledAt: '2026-07-23T16:43:00+08:00', remark: '优惠券已到账。' },
  { id: 'points-order-003', orderCode: 'JF202607230011', createdAt: '2026-07-23T09:15:00+08:00', userName: '蓝色闪电', maskedMobile: '135****7865', productName: '2 小时停车权益券', productType: 'virtual', quantity: 2, pointsCost: 1200, status: 'completed', fulfillmentMethod: '自动发放至账户', recipient: null, recipientMobile: null, address: null, fulfilledAt: '2026-07-23T09:16:00+08:00', remark: '两张权益券已到账。' },
  { id: 'points-order-004', orderCode: 'JF202607220032', createdAt: '2026-07-22T20:31:00+08:00', userName: '城市漫游者', maskedMobile: '137****1594', productName: '便携式充电枪收纳包', productType: 'physical', quantity: 1, pointsCost: 2800, status: 'cancelled', fulfillmentMethod: '快递配送', recipient: '周宁', recipientMobile: '137****1594', address: '河南省新乡市红旗区平原路 128 号', fulfilledAt: null, remark: '用户主动取消，积分已退回。' },
  { id: 'points-order-005', orderCode: 'JF202607220009', createdAt: '2026-07-22T08:56:00+08:00', userName: '电量满格', maskedMobile: '136****8430', productName: '20 元充电优惠券', productType: 'virtual', quantity: 1, pointsCost: 1500, status: 'failed', fulfillmentMethod: '自动发放至账户', recipient: null, recipientMobile: null, address: null, fulfilledAt: null, remark: '权益库存不足，积分已原路退回。' },
  { id: 'points-order-006', orderCode: 'JF202607210015', createdAt: '2026-07-21T14:13:00+08:00', userName: '秦越', maskedMobile: '176****5097', productName: '极充智联车载收纳箱', productType: 'physical', quantity: 1, pointsCost: 4600, status: 'completed', fulfillmentMethod: '快递配送', recipient: '秦越', recipientMobile: '176****5097', address: '河南省许昌市魏都区莲城大道 99 号', fulfilledAt: '2026-07-22T11:20:00+08:00', remark: '顺丰速运 SF1548362907518。' },
  { id: 'points-order-007', orderCode: 'JF202607200021', createdAt: '2026-07-20T11:06:00+08:00', userName: '晨光', maskedMobile: '158****1739', productName: '5 元充电优惠券', productType: 'virtual', quantity: 3, pointsCost: 1350, status: 'completed', fulfillmentMethod: '自动发放至账户', recipient: null, recipientMobile: null, address: null, fulfilledAt: '2026-07-20T11:07:00+08:00', remark: '三张优惠券已到账。' },
  { id: 'points-order-008', orderCode: 'JF202607190008', createdAt: '2026-07-19T08:46:00+08:00', userName: '杨帆', maskedMobile: '132****8643', productName: '便携洗车套装', productType: 'physical', quantity: 1, pointsCost: 5200, status: 'pending', fulfillmentMethod: '快递配送', recipient: '杨帆', recipientMobile: '132****8643', address: '河南省洛阳市洛龙区开元大道 260 号', fulfilledAt: null, remark: '待确认收货地址。' },
]

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
})

export function getPointsOrders(): readonly PointsOrder[] {
  return pointsOrders
}

export function getPointsOrder(orderId: string): PointsOrder | undefined {
  return pointsOrders.find((order) => order.id === orderId)
}

export function getPointsOrderStatusLabel(status: PointsOrderStatus): string {
  return pointsOrderStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatPointsOrderDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatPoints(value: number): string {
  return `${value.toLocaleString('zh-CN')} 积分`
}
