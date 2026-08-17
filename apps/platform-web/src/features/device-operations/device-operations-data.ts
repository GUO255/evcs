import { format, isValid } from 'date-fns'

export type AlertLevel = 'critical' | 'major' | 'minor'
export type AlertStatus = 'pending' | 'dispatched' | 'resolved'
export type WorkOrderStatus = 'processing' | 'pending-acceptance' | 'accepted'

export interface DeviceAlert {
  id: string
  code: string
  level: AlertLevel
  title: string
  stationName: string
  deviceCode: string
  occurredAt: string
  status: AlertStatus
  description: string
}

export interface WorkOrder {
  id: string
  code: string
  alertId: string
  alertTitle: string
  stationName: string
  deviceCode: string
  assignee: string
  deadline: string
  requirement: string
  status: WorkOrderStatus
  dispatchedAt: string
  completedAt?: string
  resolution?: string
  replacedParts?: string
  cost?: number
}

export interface RepairArchive {
  id: string
  workOrderCode: string
  stationName: string
  deviceCode: string
  fault: string
  repairer: string
  resolution: string
  replacedParts: string
  cost: number
  acceptedAt: string
  acceptedBy: string
  acceptanceRemark: string
}

export interface DispatchInput {
  assignee: string
  deadline: string
  requirement: string
}

export interface CompletionInput {
  resolution: string
  replacedParts: string
  cost: number
}

export interface AcceptanceInput {
  result: 'accepted' | 'rework'
  acceptedBy: string
  remark: string
}

const alertSeeds: readonly DeviceAlert[] = [
  { id: 'alert-001', code: 'AL20260715001', level: 'critical', title: '充电桩整机离线', stationName: '许昌东区超级充电站', deviceCode: 'DC-XC-018', occurredAt: '2026-07-15T01:42:00.000Z', status: 'pending', description: '设备连续 15 分钟未上报心跳，远程重连失败。' },
  { id: 'alert-002', code: 'AL20260715002', level: 'major', title: '充电枪绝缘检测异常', stationName: '郑州高新区充电站', deviceCode: 'DC-ZZ-032-A', occurredAt: '2026-07-15T00:16:00.000Z', status: 'pending', description: 'A 枪连续两次绝缘检测值低于安全阈值。' },
  { id: 'alert-003', code: 'AL20260714007', level: 'major', title: '模块温度过高', stationName: '郑州高新区充电站', deviceCode: 'DC-ZZ-011', occurredAt: '2026-07-14T08:35:00.000Z', status: 'dispatched', description: '功率模块温度达到 86℃，设备已自动降功率运行。' },
  { id: 'alert-004', code: 'AL20260714003', level: 'minor', title: '读卡器通信异常', stationName: '开封北站充电站', deviceCode: 'DC-KF-006', occurredAt: '2026-07-14T03:08:00.000Z', status: 'dispatched', description: '读卡器通信间歇中断，不影响扫码充电。' },
  { id: 'alert-005', code: 'AL20260713009', level: 'critical', title: '急停按钮触发', stationName: '洛阳龙门充电站', deviceCode: 'DC-LY-025', occurredAt: '2026-07-13T11:20:00.000Z', status: 'resolved', description: '现场误触急停按钮，复位后设备运行正常。' },
]

const workOrderSeeds: readonly WorkOrder[] = [
  { id: 'order-001', code: 'WO20260714001', alertId: 'alert-003', alertTitle: '模块温度过高', stationName: '郑州高新区充电站', deviceCode: 'DC-ZZ-011', assignee: '张志强', deadline: '2026-07-15T10:00:00.000Z', requirement: '检查散热风道及功率模块，恢复设备额定功率。', status: 'processing', dispatchedAt: '2026-07-14T08:48:00.000Z' },
  { id: 'order-002', code: 'WO20260714002', alertId: 'alert-004', alertTitle: '读卡器通信异常', stationName: '开封北站充电站', deviceCode: 'DC-KF-006', assignee: '王海峰', deadline: '2026-07-16T04:00:00.000Z', requirement: '检查读卡器连接线并完成通信稳定性测试。', status: 'pending-acceptance', dispatchedAt: '2026-07-14T03:25:00.000Z', completedAt: '2026-07-15T02:05:00.000Z', resolution: '重新压接通信线束并升级读卡器固件，连续测试 2 小时无中断。', replacedParts: '通信线束 1 条', cost: 180 },
  { id: 'order-003', code: 'WO20260713003', alertId: 'alert-005', alertTitle: '急停按钮触发', stationName: '洛阳龙门充电站', deviceCode: 'DC-LY-025', assignee: '李建国', deadline: '2026-07-14T04:00:00.000Z', requirement: '现场确认急停原因并检查安全回路。', status: 'accepted', dispatchedAt: '2026-07-13T11:32:00.000Z', completedAt: '2026-07-13T12:20:00.000Z', resolution: '确认现场人员误触，完成按钮复位和安全回路检测。', replacedParts: '无', cost: 0 },
]

const archiveSeeds: readonly RepairArchive[] = [
  { id: 'archive-001', workOrderCode: 'WO20260713003', stationName: '洛阳龙门充电站', deviceCode: 'DC-LY-025', fault: '急停按钮触发', repairer: '李建国', resolution: '确认现场人员误触，完成按钮复位和安全回路检测。', replacedParts: '无', cost: 0, acceptedAt: '2026-07-13T13:00:00.000Z', acceptedBy: '赵明', acceptanceRemark: '设备恢复运行，安全回路检测正常。' },
  { id: 'archive-002', workOrderCode: 'WO20260710006', stationName: '郑州高新区充电站', deviceCode: 'DC-ZZ-007-B', fault: 'B 枪电子锁故障', repairer: '张志强', resolution: '更换电子锁并完成 10 次插拔枪测试。', replacedParts: '电子锁总成 1 套', cost: 460, acceptedAt: '2026-07-10T09:30:00.000Z', acceptedBy: '陈洁', acceptanceRemark: '充电枪锁止和解锁功能正常。' },
]

export function createInitialOperationsData() {
  return {
    alerts: alertSeeds.map((item) => ({ ...item })),
    workOrders: workOrderSeeds.map((item) => ({ ...item })),
    archives: archiveSeeds.map((item) => ({ ...item })),
  }
}

export function getAlertLevelLabel(level: AlertLevel): string {
  return { critical: '紧急', major: '重要', minor: '一般' }[level]
}

export function getAlertStatusLabel(status: AlertStatus): string {
  return { pending: '待处理', dispatched: '已派发', resolved: '已关闭' }[status]
}

export function getWorkOrderStatusLabel(status: WorkOrderStatus): string {
  return { processing: '处理中', 'pending-acceptance': '待验收', accepted: '已验收' }[status]
}

export function formatRepairCost(cost: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(cost)
}

export function generateWorkOrderCode(workOrders: readonly WorkOrder[], date = new Date()): string {
  const prefix = `WO${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const maximum = workOrders.reduce((value, order) => {
    const sequence = order.code.startsWith(prefix) ? Number(order.code.slice(prefix.length)) : 0
    return Number.isFinite(sequence) ? Math.max(value, sequence) : value
  }, 0)
  return `${prefix}${String(maximum + 1).padStart(3, '0')}`
}

export function createUtcTimestamp(date = new Date()): string {
  return date.toISOString()
}

export function formatOperationDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}
