import { format, isValid } from 'date-fns'

export type RefundStatus = 'pending' | 'approved' | 'rejected'
export type RefundReason = 'device-fault' | 'billing-error' | 'duplicate-payment' | 'service-complaint' | 'other'

export interface RefundRecord {
  id: string
  refundCode: string
  orderId?: string
  orderCode: string
  userName: string
  userMobile: string
  stationName: string
  originalPaidAmount: number
  refundAmount: number
  reason: RefundReason
  reasonDescription: string
  status: RefundStatus
  appliedAt: string
  refundChannel: string
  reviewer?: string
  reviewedAt?: string
  reviewRemark?: string
}

export interface RefundReviewInput {
  decision: 'approved' | 'rejected'
  reviewer: string
  remark: string
}

export const refundReasonOptions = [
  { value: 'device-fault', label: '设备故障' },
  { value: 'billing-error', label: '计费异常' },
  { value: 'duplicate-payment', label: '重复支付' },
  { value: 'service-complaint', label: '服务投诉' },
  { value: 'other', label: '其他原因' },
] as const satisfies readonly { value: RefundReason, label: string }[]

export const refundStatusOptions = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已退款' },
  { value: 'rejected', label: '已驳回' },
] as const satisfies readonly { value: RefundStatus, label: string }[]

const seeds: readonly RefundRecord[] = [
  { id: 'refund-001', refundCode: 'TK20260714001', orderId: 'order-005', orderCode: 'CD202607140011', userName: '陈女士', userMobile: '177****8893', stationName: '开封北站充电站', originalPaidAmount: 12.25, refundAmount: 12.25, reason: 'device-fault', reasonDescription: '充电过程中设备异常停止，申请全额退款。', status: 'approved', appliedAt: '2026-07-14T06:40:00.000Z', refundChannel: '储值余额', reviewer: '赵明', reviewedAt: '2026-07-14T07:15:30.000Z', reviewRemark: '核实设备告警记录无误，同意全额退款。' },
  { id: 'refund-002', refundCode: 'TK20260715001', orderId: 'order-002', orderCode: 'CD202607150002', userName: '王女士', userMobile: '159****2078', stationName: '许昌东区超级充电站', originalPaidAmount: 40.81, refundAmount: 20.81, reason: 'billing-error', reasonDescription: '用户反馈结束充电后仍产生服务费，请复核计费明细。', status: 'pending', appliedAt: '2026-07-15T03:20:00.000Z', refundChannel: '微信支付' },
  { id: 'refund-003', refundCode: 'TK20260713002', orderId: 'order-007', orderCode: 'CD202607130027', userName: '赵女士', userMobile: '188****7159', stationName: '郑州高新区充电站', originalPaidAmount: 57.94, refundAmount: 15, reason: 'service-complaint', reasonDescription: '用户认为现场引导不清晰，申请退还部分服务费。', status: 'rejected', appliedAt: '2026-07-13T15:10:00.000Z', refundChannel: '微信支付', reviewer: '陈洁', reviewedAt: '2026-07-14T01:05:00.000Z', reviewRemark: '订单计费正常，现场服务记录未发现异常。' },
  { id: 'refund-004', refundCode: 'TK20260712006', orderCode: 'CD202607120031', userName: '河南顺达物流有限公司', userMobile: '0371****8062', stationName: '郑州高新区充电站', originalPaidAmount: 126.5, refundAmount: 36.5, reason: 'duplicate-payment', reasonDescription: '企业余额与微信渠道发生重复扣款。', status: 'approved', appliedAt: '2026-07-12T10:35:00.000Z', refundChannel: '微信支付', reviewer: '赵明', reviewedAt: '2026-07-12T11:18:00.000Z', reviewRemark: '支付流水核验为重复扣款，同意原路退回。' },
  { id: 'refund-005', refundCode: 'TK20260715002', orderCode: 'CD202607140025', userName: '孙先生', userMobile: '136****0927', stationName: '洛阳龙门充电站', originalPaidAmount: 68.2, refundAmount: 8.2, reason: 'other', reasonDescription: '停车优惠未正确抵扣，申请退还停车费用。', status: 'pending', appliedAt: '2026-07-15T05:42:00.000Z', refundChannel: '支付宝' },
]

export function createInitialRefunds(): RefundRecord[] {
  return seeds.map((refund) => ({ ...refund }))
}

export function getRefundStatusLabel(status: RefundStatus): string {
  return refundStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function getRefundReasonLabel(reason: RefundReason): string {
  return refundReasonOptions.find((option) => option.value === reason)?.label ?? reason
}

export function formatRefundDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}

export function formatRefundCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

export function summarizeRefunds(refunds: readonly RefundRecord[]) {
  const approved = refunds.filter((refund) => refund.status === 'approved')
  const decidedCount = refunds.filter((refund) => refund.status !== 'pending').length
  return {
    totalCount: refunds.length,
    pendingCount: refunds.filter((refund) => refund.status === 'pending').length,
    approvedAmount: approved.reduce((sum, refund) => sum + refund.refundAmount, 0),
    approvalRate: decidedCount === 0 ? 0 : approved.length / decidedCount,
  }
}

export function summarizeRefundReasons(refunds: readonly RefundRecord[]) {
  return refundReasonOptions.map((option) => ({
    ...option,
    count: refunds.filter((refund) => refund.reason === option.value).length,
    approvedAmount: refunds
      .filter((refund) => refund.reason === option.value && refund.status === 'approved')
      .reduce((sum, refund) => sum + refund.refundAmount, 0),
  }))
}
