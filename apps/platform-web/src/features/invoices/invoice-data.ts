import { format, isValid } from 'date-fns'

export type InvoiceSubjectType = 'customer' | 'merchant' | 'user'
export type InvoiceType = 'electronic-ordinary' | 'electronic-special'
export type InvoiceStatus = 'pending' | 'issued' | 'rejected'

export interface InvoiceRecord {
  id: string
  applicationCode: string
  invoiceNumber?: string
  subjectType: InvoiceSubjectType
  subjectCode: string
  subjectName: string
  contact: string
  invoiceType: InvoiceType
  invoiceTitle: string
  taxNumber?: string
  amount: number
  orderCount: number
  status: InvoiceStatus
  appliedAt: string
  issuedAt?: string
  deliveryTarget: string
  remark: string
}

export interface InvoiceSubjectStatistic {
  subjectType: InvoiceSubjectType
  subjectCode: string
  subjectName: string
  applicationCount: number
  issuedCount: number
  issuedAmount: number
  latestAppliedAt: string
}

export const invoiceSubjectTypeOptions = [
  { value: 'customer', label: '签约客户' },
  { value: 'merchant', label: '签约商户' },
  { value: 'user', label: '用户' },
] as const satisfies readonly { value: InvoiceSubjectType, label: string }[]

export const invoiceTypeOptions = [
  { value: 'electronic-ordinary', label: '电子普通发票' },
  { value: 'electronic-special', label: '电子专用发票' },
] as const satisfies readonly { value: InvoiceType, label: string }[]

export const invoiceStatusOptions = [
  { value: 'pending', label: '待开票' },
  { value: 'issued', label: '已开票' },
  { value: 'rejected', label: '已驳回' },
] as const satisfies readonly { value: InvoiceStatus, label: string }[]

const records: readonly InvoiceRecord[] = [
  { id: 'invoice-001', applicationCode: 'KP202607160018', invoiceNumber: '26502000000148273120', subjectType: 'customer', subjectCode: 'C000001', subjectName: '上海申城绿色物流车队有限公司', contact: '陆欣 · 13800138101', invoiceType: 'electronic-special', invoiceTitle: '上海申城绿色物流车队有限公司', taxNumber: '91310115MA1K4T8X2D', amount: 12860.4, orderCount: 168, status: 'issued', appliedAt: '2026-07-16T01:12:00.000Z', issuedAt: '2026-07-16T02:05:00.000Z', deliveryTarget: 'luxin@scly.example', remark: '六月车队充电费用' },
  { id: 'invoice-002', applicationCode: 'KP202607160017', subjectType: 'user', subjectCode: 'U202600003', subjectName: '电量满格', contact: '136****4803', invoiceType: 'electronic-ordinary', invoiceTitle: '王磊', amount: 286.6, orderCount: 9, status: 'pending', appliedAt: '2026-07-16T00:46:00.000Z', deliveryTarget: '136****4803', remark: '个人充电消费' },
  { id: 'invoice-003', applicationCode: 'KP202607150042', invoiceNumber: '26502000000148273096', subjectType: 'merchant', subjectCode: 'M000001', subjectName: '上海星链充电科技有限公司', contact: '陈静 · 13800138001', invoiceType: 'electronic-special', invoiceTitle: '上海星链充电科技有限公司', taxNumber: '91310000MA1FL8XQ2P', amount: 38620, orderCount: 1, status: 'issued', appliedAt: '2026-07-15T12:30:00.000Z', issuedAt: '2026-07-15T13:18:00.000Z', deliveryTarget: 'chenjing@xinglian.example', remark: '平台服务费' },
  { id: 'invoice-004', applicationCode: 'KP202607150039', invoiceNumber: '26502000000148273082', subjectType: 'user', subjectCode: 'U202600001', subjectName: '一路向南', contact: '138****2101', invoiceType: 'electronic-ordinary', invoiceTitle: '陈晨', amount: 468.5, orderCount: 12, status: 'issued', appliedAt: '2026-07-15T10:22:00.000Z', issuedAt: '2026-07-15T10:48:00.000Z', deliveryTarget: '138****2101', remark: '个人充电消费' },
  { id: 'invoice-005', applicationCode: 'KP202607150031', subjectType: 'customer', subjectCode: 'C000003', subjectName: '深圳湾区城配运输有限公司', contact: '郑琳 · 13900139103', invoiceType: 'electronic-special', invoiceTitle: '深圳湾区城配运输有限公司', taxNumber: '91440300MA5G8Y2L6N', amount: 18630.2, orderCount: 235, status: 'pending', appliedAt: '2026-07-15T08:15:00.000Z', deliveryTarget: 'zhenglin@wqcp.example', remark: '六月车队充电费用' },
  { id: 'invoice-006', applicationCode: 'KP202607140026', invoiceNumber: '26502000000148272953', subjectType: 'merchant', subjectCode: 'M000002', subjectName: '北京北辰新能源服务有限公司', contact: '赵琳 · 010-87654321', invoiceType: 'electronic-special', invoiceTitle: '北京北辰新能源服务有限公司', taxNumber: '91110105MA01K7RT6C', amount: 26480, orderCount: 1, status: 'issued', appliedAt: '2026-07-14T07:36:00.000Z', issuedAt: '2026-07-14T09:02:00.000Z', deliveryTarget: 'zhaolin@beichen.example', remark: '平台服务费' },
  { id: 'invoice-007', applicationCode: 'KP202607140019', subjectType: 'user', subjectCode: 'U202600005', subjectName: '蓝色闪电', contact: '135****7865', invoiceType: 'electronic-ordinary', invoiceTitle: '赵一航', amount: 352.8, orderCount: 8, status: 'rejected', appliedAt: '2026-07-14T05:20:00.000Z', deliveryTarget: '135****7865', remark: '抬头信息不完整' },
  { id: 'invoice-008', applicationCode: 'KP202607130033', invoiceNumber: '26502000000148272871', subjectType: 'customer', subjectCode: 'C000002', subjectName: '北京国科产业发展有限公司', contact: '何静 · 010-87651234', invoiceType: 'electronic-ordinary', invoiceTitle: '北京国科产业发展有限公司', taxNumber: '91110108MA01H6QP7R', amount: 6850, orderCount: 42, status: 'issued', appliedAt: '2026-07-13T11:05:00.000Z', issuedAt: '2026-07-13T12:16:00.000Z', deliveryTarget: 'hejing@gkcy.example', remark: '六月企业车辆充电费用' },
  { id: 'invoice-009', applicationCode: 'KP202607130027', invoiceNumber: '26502000000148272854', subjectType: 'user', subjectCode: 'U202600002', subjectName: '小白车主', contact: '139****3722', invoiceType: 'electronic-ordinary', invoiceTitle: '林悦', amount: 136.2, orderCount: 4, status: 'issued', appliedAt: '2026-07-13T09:42:00.000Z', issuedAt: '2026-07-13T10:08:00.000Z', deliveryTarget: '139****3722', remark: '个人充电消费' },
  { id: 'invoice-010', applicationCode: 'KP202607120024', invoiceNumber: '26502000000148272760', subjectType: 'merchant', subjectCode: 'M000003', subjectName: '深圳前海绿能交通有限公司', contact: '方敏 · 13900139003', invoiceType: 'electronic-special', invoiceTitle: '深圳前海绿能交通有限公司', taxNumber: '91440300MA5F2YLM7J', amount: 31200, orderCount: 1, status: 'issued', appliedAt: '2026-07-12T08:40:00.000Z', issuedAt: '2026-07-12T10:11:00.000Z', deliveryTarget: 'fangmin@qhln.example', remark: '平台服务费' },
  { id: 'invoice-011', applicationCode: 'KP202607110021', invoiceNumber: '26502000000148272682', subjectType: 'customer', subjectCode: 'C000005', subjectName: '南京金陵出租汽车服务有限公司', contact: '陶颖 · 025-86541230', invoiceType: 'electronic-special', invoiceTitle: '南京金陵出租汽车服务有限公司', taxNumber: '91320104MA1Y5D9W3H', amount: 42680.6, orderCount: 520, status: 'issued', appliedAt: '2026-07-11T06:28:00.000Z', issuedAt: '2026-07-11T08:32:00.000Z', deliveryTarget: 'taoying@jlcz.example', remark: '六月出租车充电费用' },
  { id: 'invoice-012', applicationCode: 'KP202607100018', subjectType: 'merchant', subjectCode: 'M000005', subjectName: '南京金陵电动出行有限公司', contact: '郭颖 · 025-86543210', invoiceType: 'electronic-special', invoiceTitle: '南京金陵电动出行有限公司', taxNumber: '91320115MA1W4K8D3H', amount: 18960, orderCount: 1, status: 'pending', appliedAt: '2026-07-10T04:56:00.000Z', deliveryTarget: 'guoying@jlcx.example', remark: '平台服务费' },
  { id: 'invoice-013', applicationCode: 'KP202607090015', invoiceNumber: '26502000000148272491', subjectType: 'user', subjectCode: 'U202600007', subjectName: '追风的猫', contact: '158****6247', invoiceType: 'electronic-ordinary', invoiceTitle: '许婧', amount: 298.3, orderCount: 7, status: 'issued', appliedAt: '2026-07-09T13:26:00.000Z', issuedAt: '2026-07-09T13:50:00.000Z', deliveryTarget: '158****6247', remark: '个人充电消费' },
  { id: 'invoice-014', applicationCode: 'KP202607080012', invoiceNumber: '26502000000148272375', subjectType: 'customer', subjectCode: 'C000006', subjectName: '成都天府商务服务有限公司', contact: '潘涛 · 13600136106', invoiceType: 'electronic-ordinary', invoiceTitle: '成都天府商务服务有限公司', taxNumber: '91510100MA6D2V8T4M', amount: 3280, orderCount: 18, status: 'issued', appliedAt: '2026-07-08T03:18:00.000Z', issuedAt: '2026-07-08T04:05:00.000Z', deliveryTarget: 'pantao@tfsw.example', remark: '六月企业车辆充电费用' },
  { id: 'invoice-015', applicationCode: 'KP202607070009', invoiceNumber: '26502000000148272268', subjectType: 'user', subjectCode: 'U202600010', subjectName: '满电回家', contact: '152****7810', invoiceType: 'electronic-ordinary', invoiceTitle: '唐雨', amount: 218.6, orderCount: 5, status: 'issued', appliedAt: '2026-07-07T12:46:00.000Z', issuedAt: '2026-07-07T13:02:00.000Z', deliveryTarget: '152****7810', remark: '个人充电消费' },
]

export function getInvoiceRecords(): readonly InvoiceRecord[] {
  return records
}

export function getInvoiceRecord(invoiceId: string): InvoiceRecord | undefined {
  return records.find((record) => record.id === invoiceId)
}

export function summarizeInvoices(invoiceRecords: readonly InvoiceRecord[]) {
  return invoiceRecords.reduce((summary, record) => {
    summary.applicationCount += 1
    if (record.status === 'issued') {
      summary.issuedCount += 1
      summary.issuedAmount += record.amount
    } else if (record.status === 'pending') {
      summary.pendingCount += 1
      summary.pendingAmount += record.amount
    }
    return summary
  }, { applicationCount: 0, issuedCount: 0, pendingCount: 0, issuedAmount: 0, pendingAmount: 0 })
}

export function summarizeInvoiceSubjects(
  invoiceRecords: readonly InvoiceRecord[],
  subjectType: InvoiceSubjectType,
): readonly InvoiceSubjectStatistic[] {
  const statistics = new Map<string, InvoiceSubjectStatistic>()
  for (const record of invoiceRecords) {
    if (record.subjectType !== subjectType) continue
    const statistic = statistics.get(record.subjectCode) ?? {
      subjectType,
      subjectCode: record.subjectCode,
      subjectName: record.subjectName,
      applicationCount: 0,
      issuedCount: 0,
      issuedAmount: 0,
      latestAppliedAt: record.appliedAt,
    }
    statistic.applicationCount += 1
    if (record.status === 'issued') {
      statistic.issuedCount += 1
      statistic.issuedAmount += record.amount
    }
    if (record.appliedAt > statistic.latestAppliedAt) statistic.latestAppliedAt = record.appliedAt
    statistics.set(record.subjectCode, statistic)
  }
  return [...statistics.values()].sort((left, right) => right.issuedAmount - left.issuedAmount)
}

export function getInvoiceSubjectTypeLabel(type: InvoiceSubjectType): string {
  return invoiceSubjectTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getInvoiceTypeLabel(type: InvoiceType): string {
  return invoiceTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return invoiceStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatInvoiceCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

export function formatInvoiceDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}
