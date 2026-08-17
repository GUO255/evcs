export type MembershipOrderStatus = 'pending-payment' | 'activated' | 'cancelled' | 'refunded'
export type MembershipPaymentMethod = 'wechat' | 'balance'

export interface MembershipOrder {
  id: string
  orderCode: string
  createdAt: string
  userName: string
  maskedMobile: string
  productName: string
  productDescription: string
  amountCents: number
  paidAmountCents: number
  paymentMethod: MembershipPaymentMethod
  status: MembershipOrderStatus
  previousMembershipStatus: string
  membershipStartAt: string | null
  membershipEndAt: string | null
  paidAt: string | null
  activatedAt: string | null
  paymentTransactionNo: string | null
  remark: string
}

export const membershipOrderStatusOptions = [
  { value: 'pending-payment', label: '待支付' },
  { value: 'activated', label: '已开通' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
] as const satisfies readonly { value: MembershipOrderStatus; label: string }[]

export const membershipPaymentMethodLabels: Readonly<Record<MembershipPaymentMethod, string>> = {
  wechat: '微信支付',
  balance: '余额支付',
}

const membershipOrders: readonly MembershipOrder[] = [
  { id: 'membership-order-001', orderCode: 'HY202607240026', createdAt: '2026-07-24T10:26:00+08:00', userName: '一路向南', maskedMobile: '138****2101', productName: '连续包月', productDescription: '首月特惠，后续按月自动续费', amountCents: 190, paidAmountCents: 190, paymentMethod: 'wechat', status: 'activated', previousMembershipStatus: '非会员', membershipStartAt: '2026-07-24T10:27:00+08:00', membershipEndAt: '2026-08-24T23:59:59+08:00', paidAt: '2026-07-24T10:27:00+08:00', activatedAt: '2026-07-24T10:27:00+08:00', paymentTransactionNo: 'WX202607241027008621', remark: '首月特惠开通成功。' },
  { id: 'membership-order-002', orderCode: 'HY202607230018', createdAt: '2026-07-23T16:42:00+08:00', userName: '小白车主', maskedMobile: '139****3722', productName: '单次季卡', productDescription: '一次购买，会员权益有效 90 天', amountCents: 2100, paidAmountCents: 2100, paymentMethod: 'balance', status: 'activated', previousMembershipStatus: '非会员', membershipStartAt: '2026-07-23T16:42:00+08:00', membershipEndAt: '2026-10-21T23:59:59+08:00', paidAt: '2026-07-23T16:42:00+08:00', activatedAt: '2026-07-23T16:42:00+08:00', paymentTransactionNo: 'YE2026072316420018', remark: '余额支付并即时生效。' },
  { id: 'membership-order-003', orderCode: 'HY202607230009', createdAt: '2026-07-23T11:07:00+08:00', userName: '蓝色闪电', maskedMobile: '135****7865', productName: '单次年卡', productDescription: '一次购买，会员权益有效 365 天', amountCents: 6000, paidAmountCents: 6000, paymentMethod: 'wechat', status: 'activated', previousMembershipStatus: '已过期', membershipStartAt: '2026-07-23T11:08:00+08:00', membershipEndAt: '2027-07-22T23:59:59+08:00', paidAt: '2026-07-23T11:08:00+08:00', activatedAt: '2026-07-23T11:08:00+08:00', paymentTransactionNo: 'WX202607231108003416', remark: '过期会员重新开通。' },
  { id: 'membership-order-004', orderCode: 'HY202607220031', createdAt: '2026-07-22T20:31:00+08:00', userName: '城市漫游者', maskedMobile: '137****1594', productName: '连续包月', productDescription: '首月特惠，后续按月自动续费', amountCents: 990, paidAmountCents: 0, paymentMethod: 'wechat', status: 'pending-payment', previousMembershipStatus: '非会员', membershipStartAt: null, membershipEndAt: null, paidAt: null, activatedAt: null, paymentTransactionNo: null, remark: '等待用户完成支付。' },
  { id: 'membership-order-005', orderCode: 'HY202607220011', createdAt: '2026-07-22T10:24:00+08:00', userName: '电量满格', maskedMobile: '136****8430', productName: '单次季卡', productDescription: '一次购买，会员权益有效 90 天', amountCents: 2100, paidAmountCents: 0, paymentMethod: 'balance', status: 'cancelled', previousMembershipStatus: '非会员', membershipStartAt: null, membershipEndAt: null, paidAt: null, activatedAt: null, paymentTransactionNo: null, remark: '用户主动取消订单。' },
  { id: 'membership-order-006', orderCode: 'HY202607210033', createdAt: '2026-07-21T18:56:00+08:00', userName: '周宁', maskedMobile: '158****1739', productName: '单次年卡', productDescription: '一次购买，会员权益有效 365 天', amountCents: 6000, paidAmountCents: 6000, paymentMethod: 'wechat', status: 'refunded', previousMembershipStatus: '非会员', membershipStartAt: '2026-07-21T18:57:00+08:00', membershipEndAt: '2027-07-20T23:59:59+08:00', paidAt: '2026-07-21T18:57:00+08:00', activatedAt: '2026-07-21T18:57:00+08:00', paymentTransactionNo: 'WX202607211857001923', remark: '支付异常，已退款并撤销会员权益。' },
  { id: 'membership-order-007', orderCode: 'HY202607200015', createdAt: '2026-07-20T14:13:00+08:00', userName: '秦越', maskedMobile: '176****5097', productName: '连续包月', productDescription: '自动续费月卡', amountCents: 990, paidAmountCents: 990, paymentMethod: 'wechat', status: 'activated', previousMembershipStatus: '会员', membershipStartAt: '2026-07-24T00:00:00+08:00', membershipEndAt: '2026-08-24T23:59:59+08:00', paidAt: '2026-07-20T14:13:00+08:00', activatedAt: '2026-07-20T14:13:00+08:00', paymentTransactionNo: 'WX202607201413009871', remark: '自动续费成功，有效期顺延。' },
  { id: 'membership-order-008', orderCode: 'HY202607190008', createdAt: '2026-07-19T08:46:00+08:00', userName: '杨帆', maskedMobile: '132****8643', productName: '单次季卡', productDescription: '一次购买，会员权益有效 90 天', amountCents: 2100, paidAmountCents: 2100, paymentMethod: 'wechat', status: 'activated', previousMembershipStatus: '非会员', membershipStartAt: '2026-07-19T08:47:00+08:00', membershipEndAt: '2026-10-17T23:59:59+08:00', paidAt: '2026-07-19T08:47:00+08:00', activatedAt: '2026-07-19T08:47:00+08:00', paymentTransactionNo: 'WX202607190847006420', remark: '会员权益即时生效。' },
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

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function getMembershipOrders(): readonly MembershipOrder[] {
  return membershipOrders
}

export function getMembershipOrder(orderId: string): MembershipOrder | undefined {
  return membershipOrders.find((order) => order.id === orderId)
}

export function getMembershipOrderStatusLabel(status: MembershipOrderStatus): string {
  return membershipOrderStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatMembershipOrderDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatMembershipCurrency(valueInCents: number): string {
  return currencyFormatter.format(valueInCents / 100)
}
