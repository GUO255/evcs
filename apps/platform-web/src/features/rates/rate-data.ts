import { format, isValid } from 'date-fns'

export type PricingMode = 'fixed' | 'time-of-use'
export type DistributionStatus = 'success' | 'partial' | 'failed'
export type DeviceDistributionStatus = 'success' | 'failed'

export interface RatePeriod {
  id: string
  startTime: string
  endTime: string
  electricityPrice: number
  serviceFee: number
}

export interface RateTemplate {
  id: string
  code: string
  name: string
  pricingMode: PricingMode
  fixedElectricityPrice: number | null
  fixedServiceFee: number | null
  periods: readonly RatePeriod[]
  remark: string
  createdAt: string
  updatedAt: string
}

export interface RateTemplateInput {
  name: string
  pricingMode: PricingMode
  fixedElectricityPrice: number | null
  fixedServiceFee: number | null
  periods: readonly RatePeriod[]
  remark: string
}

export interface DistributionDevice {
  id: string
  stationCode: string
  stationName: string
  deviceCode: string
  deviceName: string
  status: DeviceDistributionStatus
  message: string
}

export interface RateDistributionRecord {
  id: string
  distributionCode: string
  templateCode: string
  templateName: string
  pricingMode: PricingMode
  rateSummary: string
  status: DistributionStatus
  deviceCount: number
  successCount: number
  failedCount: number
  operator: string
  distributedAt: string
  devices: readonly DistributionDevice[]
}

export type RateTemplateValidationErrors = Partial<Record<'name' | 'fixedElectricityPrice' | 'fixedServiceFee' | 'periods', string>>

export const pricingModeOptions = [
  { value: 'fixed', label: '固定电价' },
  { value: 'time-of-use', label: '分时电价' },
] as const satisfies readonly { value: PricingMode, label: string }[]

export const distributionStatusOptions = [
  { value: 'success', label: '全部成功' },
  { value: 'partial', label: '部分成功' },
  { value: 'failed', label: '全部失败' },
] as const satisfies readonly { value: DistributionStatus, label: string }[]

const templateSeeds: readonly RateTemplate[] = [
  { id: 'rate-001', code: 'FL20260001', name: '河南居民充电峰谷费率', pricingMode: 'time-of-use', fixedElectricityPrice: null, fixedServiceFee: null, periods: [
    { id: 'period-001-1', startTime: '00:00', endTime: '07:00', electricityPrice: 0.31, serviceFee: 0.35 },
    { id: 'period-001-2', startTime: '07:00', endTime: '10:00', electricityPrice: 0.86, serviceFee: 0.4 },
    { id: 'period-001-3', startTime: '10:00', endTime: '18:00', electricityPrice: 0.59, serviceFee: 0.38 },
    { id: 'period-001-4', startTime: '18:00', endTime: '23:00', electricityPrice: 0.92, serviceFee: 0.42 },
    { id: 'period-001-5', startTime: '23:00', endTime: '24:00', electricityPrice: 0.31, serviceFee: 0.35 },
  ], remark: '河南区域居民公共充电站标准模板。', createdAt: '2026-01-08T02:20:00.000Z', updatedAt: '2026-07-10T08:15:00.000Z' },
  { id: 'rate-002', code: 'FL20260002', name: '物流园区全天统一费率', pricingMode: 'fixed', fixedElectricityPrice: 0.68, fixedServiceFee: 0.32, periods: [], remark: '物流园区合作客户统一价。', createdAt: '2026-02-12T04:30:00.000Z', updatedAt: '2026-06-28T03:40:00.000Z' },
  { id: 'rate-003', code: 'FL20260003', name: '超级充电站峰谷费率', pricingMode: 'time-of-use', fixedElectricityPrice: null, fixedServiceFee: null, periods: [
    { id: 'period-003-1', startTime: '00:00', endTime: '08:00', electricityPrice: 0.28, serviceFee: 0.5 },
    { id: 'period-003-2', startTime: '08:00', endTime: '12:00', electricityPrice: 0.82, serviceFee: 0.6 },
    { id: 'period-003-3', startTime: '12:00', endTime: '17:00', electricityPrice: 0.56, serviceFee: 0.55 },
    { id: 'period-003-4', startTime: '17:00', endTime: '22:00', electricityPrice: 0.95, serviceFee: 0.65 },
    { id: 'period-003-5', startTime: '22:00', endTime: '24:00', electricityPrice: 0.28, serviceFee: 0.5 },
  ], remark: '液冷超充站使用。', createdAt: '2026-03-16T06:10:00.000Z', updatedAt: '2026-07-08T02:25:00.000Z' },
  { id: 'rate-004', code: 'FL20260004', name: '企业客户专享固定费率', pricingMode: 'fixed', fixedElectricityPrice: 0.62, fixedServiceFee: 0.28, periods: [], remark: '签约企业客户专享。', createdAt: '2026-04-05T01:48:00.000Z', updatedAt: '2026-06-20T07:36:00.000Z' },
  { id: 'rate-005', code: 'FL20260005', name: '节假日分时费率', pricingMode: 'time-of-use', fixedElectricityPrice: null, fixedServiceFee: null, periods: [
    { id: 'period-005-1', startTime: '00:00', endTime: '09:00', electricityPrice: 0.3, serviceFee: 0.3 },
    { id: 'period-005-2', startTime: '09:00', endTime: '21:00', electricityPrice: 0.72, serviceFee: 0.38 },
    { id: 'period-005-3', startTime: '21:00', endTime: '24:00', electricityPrice: 0.3, serviceFee: 0.3 },
  ], remark: '法定节假日临时费率模板。', createdAt: '2026-05-18T05:20:00.000Z', updatedAt: '2026-07-01T01:18:00.000Z' },
  { id: 'rate-006', code: 'FL20260006', name: '夜间优惠固定费率', pricingMode: 'fixed', fixedElectricityPrice: 0.45, fixedServiceFee: 0.25, periods: [], remark: '夜间运营活动使用。', createdAt: '2026-06-22T03:26:00.000Z', updatedAt: '2026-06-22T03:26:00.000Z' },
]

const deviceGroups: readonly (readonly DistributionDevice[])[] = [
  [
    { id: 'dist-device-001', stationCode: 'S327001', stationName: 'S327 国道禹州美之源站', deviceCode: 'DC-S327-01', deviceName: '双枪直流桩 1 号', status: 'success', message: '下发成功' },
    { id: 'dist-device-002', stationCode: 'S327001', stationName: 'S327 国道禹州美之源站', deviceCode: 'DC-S327-02', deviceName: '双枪直流桩 2 号', status: 'failed', message: '设备离线，等待重试' },
    { id: 'dist-device-003', stationCode: 'S327001', stationName: 'S327 国道禹州美之源站', deviceCode: 'AC-S327-01', deviceName: '交流桩 1 号', status: 'success', message: '下发成功' },
  ],
  [
    { id: 'dist-device-004', stationCode: 'S411001', stationName: '许昌东环路超级充电站', deviceCode: 'DC-XC-01', deviceName: '液冷超充终端 1 号', status: 'success', message: '下发成功' },
  ],
  [
    { id: 'dist-device-005', stationCode: 'S410001', stationName: '郑州航空港智慧能源站', deviceCode: 'DC-ZZ-01', deviceName: '双枪直流桩 1 号', status: 'failed', message: '设备响应超时' },
    { id: 'dist-device-006', stationCode: 'S410001', stationName: '郑州航空港智慧能源站', deviceCode: 'DC-ZZ-02', deviceName: '双枪直流桩 2 号', status: 'failed', message: '设备响应超时' },
  ],
]

const distributionSeeds: readonly RateDistributionRecord[] = [
  distribution('distribution-001', 'XF202607160018', templateSeeds[0]!, 'partial', '张伟', '2026-07-16T01:28:00.000Z', deviceGroups[0]!),
  distribution('distribution-002', 'XF202607150036', templateSeeds[2]!, 'success', '李娜', '2026-07-15T10:16:00.000Z', deviceGroups[1]!),
  distribution('distribution-003', 'XF202607140029', templateSeeds[1]!, 'failed', '张伟', '2026-07-14T07:42:00.000Z', deviceGroups[2]!),
  distribution('distribution-004', 'XF202607120021', templateSeeds[3]!, 'success', '王强', '2026-07-12T08:05:00.000Z', deviceGroups[1]!),
  distribution('distribution-005', 'XF202607100018', templateSeeds[0]!, 'success', '李娜', '2026-07-10T08:20:00.000Z', deviceGroups[0]!.map((item) => ({ ...item, id: `${item.id}-5`, status: 'success', message: '下发成功' }))),
  distribution('distribution-006', 'XF202607080016', templateSeeds[2]!, 'success', '王强', '2026-07-08T02:35:00.000Z', deviceGroups[1]!),
  distribution('distribution-007', 'XF202607050012', templateSeeds[4]!, 'partial', '张伟', '2026-07-05T03:10:00.000Z', deviceGroups[0]!),
  distribution('distribution-008', 'XF202607010009', templateSeeds[4]!, 'success', '李娜', '2026-07-01T01:26:00.000Z', deviceGroups[1]!),
  distribution('distribution-009', 'XF202606280025', templateSeeds[1]!, 'success', '王强', '2026-06-28T03:48:00.000Z', deviceGroups[0]!.map((item) => ({ ...item, id: `${item.id}-9`, status: 'success', message: '下发成功' }))),
  distribution('distribution-010', 'XF202606220017', templateSeeds[5]!, 'success', '张伟', '2026-06-22T03:35:00.000Z', deviceGroups[1]!),
  distribution('distribution-011', 'XF202606200014', templateSeeds[3]!, 'failed', '李娜', '2026-06-20T07:42:00.000Z', deviceGroups[2]!),
  distribution('distribution-012', 'XF202606180011', templateSeeds[0]!, 'success', '王强', '2026-06-18T01:30:00.000Z', deviceGroups[0]!.map((item) => ({ ...item, id: `${item.id}-12`, status: 'success', message: '下发成功' }))),
]

function distribution(id: string, distributionCode: string, template: RateTemplate, status: DistributionStatus, operator: string, distributedAt: string, devices: readonly DistributionDevice[]): RateDistributionRecord {
  const successCount = devices.filter((device) => device.status === 'success').length
  return { id, distributionCode, templateCode: template.code, templateName: template.name, pricingMode: template.pricingMode, rateSummary: getRateSummary(template), status, deviceCount: devices.length, successCount, failedCount: devices.length - successCount, operator, distributedAt, devices }
}

export function createInitialRateTemplates(): RateTemplate[] {
  return templateSeeds.map((template) => ({ ...template, periods: template.periods.map((period) => ({ ...period })) }))
}

export function getRateDistributionRecords(): readonly RateDistributionRecord[] {
  return distributionSeeds
}

export function validateRateTemplateInput(input: RateTemplateInput, templates: readonly RateTemplate[], currentId?: string): RateTemplateValidationErrors {
  const errors: RateTemplateValidationErrors = {}
  if (!input.name.trim()) errors.name = '请输入模板名称'
  else if (templates.some((template) => template.id !== currentId && template.name === input.name.trim())) errors.name = '模板名称已存在'
  if (input.pricingMode === 'fixed') {
    if (input.fixedElectricityPrice === null || !Number.isFinite(input.fixedElectricityPrice) || input.fixedElectricityPrice < 0) errors.fixedElectricityPrice = '请输入不小于 0 的电价'
    if (input.fixedServiceFee === null || !Number.isFinite(input.fixedServiceFee) || input.fixedServiceFee < 0) errors.fixedServiceFee = '请输入不小于 0 的服务费'
  } else {
    errors.periods = validateRatePeriods(input.periods)
  }
  return errors
}

export function validateRatePeriods(periods: readonly RatePeriod[]): string | undefined {
  if (periods.length === 0) return '请至少添加一个时段'
  let expectedStart = 0
  for (const period of periods) {
    const start = timeToMinutes(period.startTime)
    const end = timeToMinutes(period.endTime)
    if (start === null || end === null || end <= start) return '时段起止时间不合法'
    if (start !== expectedStart) return '时段必须从 00:00 开始连续衔接，且不能重叠或留空'
    if (!Number.isFinite(period.electricityPrice) || period.electricityPrice < 0 || !Number.isFinite(period.serviceFee) || period.serviceFee < 0) return '电价和服务费必须是不小于 0 的数字'
    expectedStart = end
  }
  return expectedStart === 1440 ? undefined : '最后一个时段必须结束于 24:00'
}

export function timeToMinutes(value: string): number | null {
  if (value === '24:00') return 1440
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}

export function getRateSummary(template: Pick<RateTemplate, 'pricingMode' | 'fixedElectricityPrice' | 'fixedServiceFee' | 'periods'>): string {
  if (template.pricingMode === 'fixed') return `电价 ${formatRatePrice(template.fixedElectricityPrice ?? 0)} + 服务费 ${formatRatePrice(template.fixedServiceFee ?? 0)}`
  const totals = template.periods.map((period) => period.electricityPrice + period.serviceFee)
  return `${template.periods.length} 个时段，合计 ${formatRatePrice(Math.min(...totals))}–${formatRatePrice(Math.max(...totals))}`
}

export function getPricingModeLabel(mode: PricingMode): string {
  return pricingModeOptions.find((option) => option.value === mode)?.label ?? mode
}

export function getDistributionStatusLabel(status: DistributionStatus): string {
  return distributionStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatRatePrice(value: number): string {
  return `${value.toFixed(4)} 元/度`
}

export function formatRateDateTime(value?: string): string {
  if (!value) return 'never'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : 'invalid date'
}

export function generateRateTemplateCode(templates: readonly RateTemplate[]): string {
  const maximum = templates.reduce((value, template) => Math.max(value, Number(template.code.replace(/^FL/, '')) || 0), 0)
  return `FL${String(maximum + 1).padStart(8, '0')}`
}
