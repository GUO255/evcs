import { format, isValid } from 'date-fns'

export type SettlementStatus = 'pending' | 'settled' | 'failed'

export interface MerchantSettlementRecord {
  id: string
  settlementCode: string
  merchantCode: string
  merchantName: string
  contact: string
  period: string
  orderCount: number
  transactionAmount: number
  serviceFee: number
  adjustmentAmount: number
  settlementAmount: number
  status: SettlementStatus
  createdAt: string
  settledAt?: string
  paymentReference?: string
  remark: string
}

export interface MerchantSettlementStatistic {
  merchantCode: string
  merchantName: string
  settlementCount: number
  settledCount: number
  transactionAmount: number
  settlementAmount: number
  settledAmount: number
  latestCreatedAt: string
}

export const settlementStatusOptions = [
  { value: 'pending', label: '待结算' },
  { value: 'settled', label: '已结算' },
  { value: 'failed', label: '结算失败' },
] as const satisfies readonly { value: SettlementStatus, label: string }[]

const records: readonly MerchantSettlementRecord[] = [
  { id: 'settlement-001', settlementCode: 'JS202607160012', merchantCode: 'M000001', merchantName: '上海星链充电科技有限公司', contact: '陈静 · 13800138001', period: '2026-07', orderCount: 1386, transactionAmount: 186420, serviceFee: 5592.6, adjustmentAmount: 200, settlementAmount: 181027.4, status: 'settled', createdAt: '2026-07-16T01:20:00.000Z', settledAt: '2026-07-16T03:08:00.000Z', paymentReference: 'PAY202607160083', remark: '七月上半月结算' },
  { id: 'settlement-002', settlementCode: 'JS202607160011', merchantCode: 'M000002', merchantName: '北京北辰新能源服务有限公司', contact: '赵琳 · 010-87654321', period: '2026-07', orderCount: 968, transactionAmount: 128650, serviceFee: 3859.5, adjustmentAmount: 0, settlementAmount: 124790.5, status: 'pending', createdAt: '2026-07-16T00:45:00.000Z', remark: '七月上半月结算' },
  { id: 'settlement-003', settlementCode: 'JS202607150026', merchantCode: 'M000003', merchantName: '深圳前海绿能交通有限公司', contact: '方敏 · 13900139003', period: '2026-07', orderCount: 1120, transactionAmount: 153800, serviceFee: 4614, adjustmentAmount: -350, settlementAmount: 148836, status: 'settled', createdAt: '2026-07-15T08:32:00.000Z', settledAt: '2026-07-15T11:26:00.000Z', paymentReference: 'PAY202607150146', remark: '扣减异常订单差额' },
  { id: 'settlement-004', settlementCode: 'JS202607150021', merchantCode: 'M000005', merchantName: '南京金陵电动出行有限公司', contact: '郭颖 · 025-86543210', period: '2026-07', orderCount: 845, transactionAmount: 109760, serviceFee: 3292.8, adjustmentAmount: 0, settlementAmount: 106467.2, status: 'failed', createdAt: '2026-07-15T05:18:00.000Z', remark: '收款账户状态异常' },
  { id: 'settlement-005', settlementCode: 'JS202607010018', merchantCode: 'M000001', merchantName: '上海星链充电科技有限公司', contact: '陈静 · 13800138001', period: '2026-06', orderCount: 2698, transactionAmount: 362580, serviceFee: 10877.4, adjustmentAmount: 0, settlementAmount: 351702.6, status: 'settled', createdAt: '2026-07-01T01:08:00.000Z', settledAt: '2026-07-01T03:42:00.000Z', paymentReference: 'PAY202607010062', remark: '六月月度结算' },
  { id: 'settlement-006', settlementCode: 'JS202607010017', merchantCode: 'M000002', merchantName: '北京北辰新能源服务有限公司', contact: '赵琳 · 010-87654321', period: '2026-06', orderCount: 1875, transactionAmount: 248900, serviceFee: 7467, adjustmentAmount: 120, settlementAmount: 241553, status: 'settled', createdAt: '2026-07-01T00:56:00.000Z', settledAt: '2026-07-01T04:15:00.000Z', paymentReference: 'PAY202607010071', remark: '补计五月服务奖励' },
  { id: 'settlement-007', settlementCode: 'JS202607010015', merchantCode: 'M000003', merchantName: '深圳前海绿能交通有限公司', contact: '方敏 · 13900139003', period: '2026-06', orderCount: 2156, transactionAmount: 296340, serviceFee: 8890.2, adjustmentAmount: 0, settlementAmount: 287449.8, status: 'settled', createdAt: '2026-07-01T00:42:00.000Z', settledAt: '2026-07-01T05:06:00.000Z', paymentReference: 'PAY202607010085', remark: '六月月度结算' },
  { id: 'settlement-008', settlementCode: 'JS202607010012', merchantCode: 'M000006', merchantName: '成都蓉城充换电服务有限公司', contact: '蒋涛 · 13600136006', period: '2026-06', orderCount: 1642, transactionAmount: 218760, serviceFee: 6562.8, adjustmentAmount: -180, settlementAmount: 212017.2, status: 'settled', createdAt: '2026-07-01T00:30:00.000Z', settledAt: '2026-07-01T05:48:00.000Z', paymentReference: 'PAY202607010094', remark: '扣减退款订单服务费' },
  { id: 'settlement-009', settlementCode: 'JS202606160014', merchantCode: 'M000005', merchantName: '南京金陵电动出行有限公司', contact: '郭颖 · 025-86543210', period: '2026-06', orderCount: 792, transactionAmount: 102480, serviceFee: 3074.4, adjustmentAmount: 0, settlementAmount: 99405.6, status: 'settled', createdAt: '2026-06-16T01:15:00.000Z', settledAt: '2026-06-16T03:20:00.000Z', paymentReference: 'PAY202606160078', remark: '六月上半月结算' },
  { id: 'settlement-010', settlementCode: 'JS202606010020', merchantCode: 'M000001', merchantName: '上海星链充电科技有限公司', contact: '陈静 · 13800138001', period: '2026-05', orderCount: 2510, transactionAmount: 338600, serviceFee: 10158, adjustmentAmount: 300, settlementAmount: 328742, status: 'settled', createdAt: '2026-06-01T01:05:00.000Z', settledAt: '2026-06-01T03:56:00.000Z', paymentReference: 'PAY202606010067', remark: '五月月度结算' },
  { id: 'settlement-011', settlementCode: 'JS202606010018', merchantCode: 'M000009', merchantName: '重庆山城能源管理有限公司', contact: '熊倩 · 023-65432109', period: '2026-05', orderCount: 1368, transactionAmount: 176520, serviceFee: 5295.6, adjustmentAmount: 0, settlementAmount: 171224.4, status: 'settled', createdAt: '2026-06-01T00:52:00.000Z', settledAt: '2026-06-01T04:38:00.000Z', paymentReference: 'PAY202606010076', remark: '五月月度结算' },
  { id: 'settlement-012', settlementCode: 'JS202606010016', merchantCode: 'M000006', merchantName: '成都蓉城充换电服务有限公司', contact: '蒋涛 · 13600136006', period: '2026-05', orderCount: 1512, transactionAmount: 201860, serviceFee: 6055.8, adjustmentAmount: 0, settlementAmount: 195804.2, status: 'settled', createdAt: '2026-06-01T00:40:00.000Z', settledAt: '2026-06-01T05:02:00.000Z', paymentReference: 'PAY202606010088', remark: '五月月度结算' },
  { id: 'settlement-013', settlementCode: 'JS202605160011', merchantCode: 'M000010', merchantName: '苏州园区智慧停车有限公司', contact: '陶俊 · 13300133010', period: '2026-05', orderCount: 685, transactionAmount: 88640, serviceFee: 2659.2, adjustmentAmount: 0, settlementAmount: 85980.8, status: 'settled', createdAt: '2026-05-16T02:12:00.000Z', settledAt: '2026-05-16T04:26:00.000Z', paymentReference: 'PAY202605160052', remark: '五月上半月结算' },
  { id: 'settlement-014', settlementCode: 'JS202605010019', merchantCode: 'M000003', merchantName: '深圳前海绿能交通有限公司', contact: '方敏 · 13900139003', period: '2026-04', orderCount: 2030, transactionAmount: 278260, serviceFee: 8347.8, adjustmentAmount: 150, settlementAmount: 270062.2, status: 'settled', createdAt: '2026-05-01T00:38:00.000Z', settledAt: '2026-05-01T03:44:00.000Z', paymentReference: 'PAY202605010074', remark: '四月月度结算' },
  { id: 'settlement-015', settlementCode: 'JS202605010014', merchantCode: 'M000009', merchantName: '重庆山城能源管理有限公司', contact: '熊倩 · 023-65432109', period: '2026-04', orderCount: 1285, transactionAmount: 165980, serviceFee: 4979.4, adjustmentAmount: 0, settlementAmount: 161000.6, status: 'settled', createdAt: '2026-05-01T00:26:00.000Z', settledAt: '2026-05-01T04:20:00.000Z', paymentReference: 'PAY202605010082', remark: '四月月度结算' },
]

export function getMerchantSettlementRecords(): readonly MerchantSettlementRecord[] {
  return records
}

export function getMerchantSettlementRecord(settlementId: string): MerchantSettlementRecord | undefined {
  return records.find((record) => record.id === settlementId)
}

export function summarizeMerchantSettlements(settlementRecords: readonly MerchantSettlementRecord[]) {
  return settlementRecords.reduce((summary, record) => {
    summary.totalCount += 1
    summary.settlementAmount += record.settlementAmount
    if (record.status === 'settled') {
      summary.settledCount += 1
      summary.settledAmount += record.settlementAmount
    } else if (record.status === 'pending') {
      summary.pendingCount += 1
      summary.pendingAmount += record.settlementAmount
    }
    return summary
  }, { totalCount: 0, settledCount: 0, pendingCount: 0, settlementAmount: 0, settledAmount: 0, pendingAmount: 0 })
}

export function summarizeSettlementsByMerchant(settlementRecords: readonly MerchantSettlementRecord[]): readonly MerchantSettlementStatistic[] {
  const statistics = new Map<string, MerchantSettlementStatistic>()
  for (const record of settlementRecords) {
    const statistic = statistics.get(record.merchantCode) ?? { merchantCode: record.merchantCode, merchantName: record.merchantName, settlementCount: 0, settledCount: 0, transactionAmount: 0, settlementAmount: 0, settledAmount: 0, latestCreatedAt: record.createdAt }
    statistic.settlementCount += 1
    statistic.transactionAmount += record.transactionAmount
    statistic.settlementAmount += record.settlementAmount
    if (record.status === 'settled') {
      statistic.settledCount += 1
      statistic.settledAmount += record.settlementAmount
    }
    if (record.createdAt > statistic.latestCreatedAt) statistic.latestCreatedAt = record.createdAt
    statistics.set(record.merchantCode, statistic)
  }
  return [...statistics.values()].sort((left, right) => right.settledAmount - left.settledAmount)
}

export function getSettlementStatusLabel(status: SettlementStatus): string {
  return settlementStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatSettlementCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

export function formatSettlementDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}
