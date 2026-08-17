import { format, isValid } from 'date-fns'

export type StoredValueSubjectType = 'user' | 'customer'
export type StoredValueTransactionType = 'top-up' | 'bonus' | 'consumption' | 'refund' | 'adjustment'
export type StoredValueTransactionStatus = 'success' | 'processing' | 'failed'

export interface StoredValueRecord {
  id: string
  transactionCode: string
  subjectType: StoredValueSubjectType
  subjectId: string
  subjectCode: string
  subjectName: string
  contact: string
  transactionType: StoredValueTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  channel: string
  status: StoredValueTransactionStatus
  occurredAt: string
  relatedCode?: string
  remark: string
}

export const storedValueSubjectTypeOptions = [
  { value: 'user', label: '用户' },
  { value: 'customer', label: '签约客户' },
] as const satisfies readonly { value: StoredValueSubjectType, label: string }[]

export const storedValueTransactionTypeOptions = [
  { value: 'top-up', label: '储值入账' },
  { value: 'bonus', label: '赠送入账' },
  { value: 'consumption', label: '消费扣款' },
  { value: 'refund', label: '退款入账' },
  { value: 'adjustment', label: '人工调整' },
] as const satisfies readonly { value: StoredValueTransactionType, label: string }[]

export const storedValueStatusOptions = [
  { value: 'success', label: '成功' },
  { value: 'processing', label: '处理中' },
  { value: 'failed', label: '失败' },
] as const satisfies readonly { value: StoredValueTransactionStatus, label: string }[]

const records: readonly StoredValueRecord[] = [
  { id: 'sv-001', transactionCode: 'CZ202607160001', subjectType: 'user', subjectId: 'user-001', subjectCode: 'U202600001', subjectName: '一路向南', contact: '138****2101', transactionType: 'consumption', amount: -36.5, balanceBefore: 305, balanceAfter: 268.5, channel: '储值余额', status: 'success', occurredAt: '2026-07-16T01:18:00.000Z', relatedCode: 'CD202607160012', remark: '充电订单自动扣款' },
  { id: 'sv-002', transactionCode: 'CZ202607160002', subjectType: 'customer', subjectId: 'customer-001', subjectCode: 'C000001', subjectName: '上海申城绿色物流车队有限公司', contact: '陆欣 · 13800138101', transactionType: 'top-up', amount: 20000, balanceBefore: 48650, balanceAfter: 68650, channel: '银行转账', status: 'success', occurredAt: '2026-07-16T00:42:00.000Z', relatedCode: 'BANK20260716083', remark: '车队月度运营资金储值' },
  { id: 'sv-003', transactionCode: 'CZ202607150018', subjectType: 'user', subjectId: 'user-002', subjectCode: 'U202600002', subjectName: '小白车主', contact: '139****3722', transactionType: 'consumption', amount: -65, balanceBefore: 100, balanceAfter: 35, channel: '储值余额', status: 'success', occurredAt: '2026-07-15T13:26:00.000Z', relatedCode: 'CD202607150046', remark: '充电订单自动扣款' },
  { id: 'sv-004', transactionCode: 'CZ202607150017', subjectType: 'user', subjectId: 'user-002', subjectCode: 'U202600002', subjectName: '小白车主', contact: '139****3722', transactionType: 'top-up', amount: 100, balanceBefore: 0, balanceAfter: 100, channel: '微信支付', status: 'success', occurredAt: '2026-07-15T12:55:00.000Z', relatedCode: 'WX2026071520551802', remark: '用户主动储值' },
  { id: 'sv-005', transactionCode: 'CZ202607150016', subjectType: 'customer', subjectId: 'customer-003', subjectCode: 'C000003', subjectName: '深圳湾区城配运输有限公司', contact: '郑琳 · 13900139103', transactionType: 'consumption', amount: -1860.4, balanceBefore: 32780.6, balanceAfter: 30920.2, channel: '企业余额', status: 'success', occurredAt: '2026-07-15T10:30:00.000Z', relatedCode: 'BILL20260715003', remark: '车队充电订单批量结算' },
  { id: 'sv-006', transactionCode: 'CZ202607150012', subjectType: 'user', subjectId: 'user-003', subjectCode: 'U202600003', subjectName: '电量满格', contact: '136****4803', transactionType: 'top-up', amount: 500, balanceBefore: 20.8, balanceAfter: 520.8, channel: '支付宝', status: 'success', occurredAt: '2026-07-15T08:06:00.000Z', relatedCode: 'ALI2026071516063381', remark: '用户主动储值' },
  { id: 'sv-007', transactionCode: 'CZ202607150009', subjectType: 'customer', subjectId: 'customer-002', subjectCode: 'C000002', subjectName: '北京国科产业发展有限公司', contact: '何静 · 010-87651234', transactionType: 'bonus', amount: 500, balanceBefore: 12500, balanceAfter: 13000, channel: '运营活动', status: 'success', occurredAt: '2026-07-15T05:20:00.000Z', relatedCode: 'A20260005', remark: '企业客户季度储值赠送' },
  { id: 'sv-008', transactionCode: 'CZ202607140021', subjectType: 'user', subjectId: 'user-005', subjectCode: 'U202600005', subjectName: '蓝色闪电', contact: '135****7865', transactionType: 'refund', amount: 28, balanceBefore: 160, balanceAfter: 188, channel: '储值余额', status: 'success', occurredAt: '2026-07-14T11:12:00.000Z', relatedCode: 'TK20260714009', remark: '异常充电订单退款入账' },
  { id: 'sv-009', transactionCode: 'CZ202607140015', subjectType: 'customer', subjectId: 'customer-005', subjectCode: 'C000005', subjectName: '南京金陵出租汽车服务有限公司', contact: '陶颖 · 025-86541230', transactionType: 'top-up', amount: 50000, balanceBefore: 76200, balanceAfter: 76200, channel: '银行转账', status: 'processing', occurredAt: '2026-07-14T07:35:00.000Z', relatedCode: 'BANK20260714051', remark: '银行流水到账确认中' },
  { id: 'sv-010', transactionCode: 'CZ202607130026', subjectType: 'user', subjectId: 'user-004', subjectCode: 'U202600004', subjectName: '城市漫游者', contact: '137****1594', transactionType: 'consumption', amount: -18.4, balanceBefore: 31, balanceAfter: 12.6, channel: '储值余额', status: 'success', occurredAt: '2026-07-13T14:08:00.000Z', relatedCode: 'CD202607130052', remark: '充电订单自动扣款' },
  { id: 'sv-011', transactionCode: 'CZ202607130019', subjectType: 'customer', subjectId: 'customer-006', subjectCode: 'C000006', subjectName: '成都天府商务服务有限公司', contact: '潘涛 · 13600136106', transactionType: 'adjustment', amount: -120, balanceBefore: 8950, balanceAfter: 8830, channel: '后台调整', status: 'success', occurredAt: '2026-07-13T09:48:00.000Z', relatedCode: 'ADJ20260713002', remark: '冲正重复赠送金额' },
  { id: 'sv-012', transactionCode: 'CZ202607120031', subjectType: 'user', subjectId: 'user-007', subjectCode: 'U202600007', subjectName: '追风的猫', contact: '158****6247', transactionType: 'bonus', amount: 20, balanceBefore: 296.2, balanceAfter: 316.2, channel: '运营活动', status: 'success', occurredAt: '2026-07-12T13:16:00.000Z', relatedCode: 'A20260001', remark: '夏日畅充储值礼赠送' },
  { id: 'sv-013', transactionCode: 'CZ202607120024', subjectType: 'customer', subjectId: 'customer-009', subjectCode: 'C000009', subjectName: '重庆山城冷链运输有限公司', contact: '邱倩 · 023-65431209', transactionType: 'top-up', amount: 10000, balanceBefore: 15800, balanceAfter: 15800, channel: '银行转账', status: 'failed', occurredAt: '2026-07-12T08:22:00.000Z', relatedCode: 'BANK20260712038', remark: '付款账户信息不匹配，入账失败' },
  { id: 'sv-014', transactionCode: 'CZ202607110018', subjectType: 'user', subjectId: 'user-010', subjectCode: 'U202600010', subjectName: '满电回家', contact: '152****7810', transactionType: 'top-up', amount: 300, balanceBefore: 130, balanceAfter: 430, channel: '微信支付', status: 'success', occurredAt: '2026-07-11T12:40:00.000Z', relatedCode: 'WX2026071120402650', remark: '用户主动储值' },
]

export function getStoredValueRecords(): readonly StoredValueRecord[] {
  return records
}

export function getStoredValueRecord(recordId: string): StoredValueRecord | undefined {
  return records.find((record) => record.id === recordId)
}

export function getStoredValueSubjectTypeLabel(type: StoredValueSubjectType): string {
  return storedValueSubjectTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getStoredValueTransactionTypeLabel(type: StoredValueTransactionType): string {
  return storedValueTransactionTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getStoredValueStatusLabel(status: StoredValueTransactionStatus): string {
  return storedValueStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatStoredValueDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}

export function formatStoredValueCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}
