import { format, isValid } from 'date-fns'

export type ChargingOrderStatus = 'charging' | 'pending-payment' | 'completed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface ChargingOrder {
  id: string
  orderCode: string
  status: ChargingOrderStatus
  userName: string
  userMobile: string
  vehiclePlate: string
  stationName: string
  stationCode: string
  deviceCode: string
  connectorCode: string
  startTime: string
  endTime?: string
  durationMinutes: number
  startSoc: number
  endSoc?: number
  startMeterReading: number
  endMeterReading?: number
  energy: number
  electricityFee: number
  serviceFee: number
  parkingFee: number
  discountAmount: number
  payableAmount: number
  paidAmount: number
  paymentStatus: PaymentStatus
  paymentMethod?: string
  paymentTransactionNo?: string
  paidAt?: string
  couponName?: string
  stopReason?: string
  refundedAt?: string
  refundReason?: string
}

export const chargingOrderStatusOptions = [
  { value: 'charging', label: '充电中' },
  { value: 'pending-payment', label: '待支付' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
] as const satisfies readonly { value: ChargingOrderStatus, label: string }[]

export const paymentStatusOptions = [
  { value: 'unpaid', label: '未支付' },
  { value: 'paid', label: '已支付' },
  { value: 'refunded', label: '已退款' },
] as const satisfies readonly { value: PaymentStatus, label: string }[]

const orders: readonly ChargingOrder[] = [
  {
    id: 'order-001', orderCode: 'CD202607150001', status: 'charging', userName: '李先生', userMobile: '138****5621', vehiclePlate: '豫A·8K52D',
    stationName: '郑州高新区充电站', stationCode: 'S41010001', deviceCode: 'DC-ZZ-032', connectorCode: 'A枪', startTime: '2026-07-15T02:18:00.000Z',
    durationMinutes: 68, startSoc: 24, startMeterReading: 18652.41, energy: 31.86, electricityFee: 28.67, serviceFee: 12.74, parkingFee: 0,
    discountAmount: 3, payableAmount: 38.41, paidAmount: 0, paymentStatus: 'unpaid', couponName: '夏夜充电立减券',
  },
  {
    id: 'order-002', orderCode: 'CD202607150002', status: 'completed', userName: '王女士', userMobile: '159****2078', vehiclePlate: '豫K·D9036',
    stationName: '许昌东区超级充电站', stationCode: 'S41100002', deviceCode: 'DC-XC-018', connectorCode: 'B枪', startTime: '2026-07-15T01:05:00.000Z', endTime: '2026-07-15T01:58:00.000Z',
    durationMinutes: 53, startSoc: 31, endSoc: 86, startMeterReading: 9732.18, endMeterReading: 9769.72, energy: 37.54, electricityFee: 33.79, serviceFee: 15.02, parkingFee: 0,
    discountAmount: 8, payableAmount: 40.81, paidAmount: 40.81, paymentStatus: 'paid', paymentMethod: '微信支付', paymentTransactionNo: 'WX2026071501583208', paidAt: '2026-07-15T01:59:12.000Z', couponName: '满30减8元券', stopReason: '用户主动结束充电',
  },
  {
    id: 'order-003', orderCode: 'CD202607150003', status: 'pending-payment', userName: '张先生', userMobile: '186****4105', vehiclePlate: '豫A·Q71M8',
    stationName: '郑州高新区充电站', stationCode: 'S41010001', deviceCode: 'DC-ZZ-011', connectorCode: 'A枪', startTime: '2026-07-14T23:42:00.000Z', endTime: '2026-07-15T00:36:00.000Z',
    durationMinutes: 54, startSoc: 18, endSoc: 80, startMeterReading: 24318.66, endMeterReading: 24360.84, energy: 42.18, electricityFee: 37.96, serviceFee: 16.87, parkingFee: 0,
    discountAmount: 0, payableAmount: 54.83, paidAmount: 0, paymentStatus: 'unpaid', stopReason: '车辆达到设定电量',
  },
  {
    id: 'order-004', orderCode: 'CD202607140018', status: 'completed', userName: '许昌安达运输有限公司', userMobile: '0374****6218', vehiclePlate: '豫K·A6285',
    stationName: '许昌东区超级充电站', stationCode: 'S41100002', deviceCode: 'DC-XC-006', connectorCode: 'A枪', startTime: '2026-07-14T12:26:00.000Z', endTime: '2026-07-14T13:45:00.000Z',
    durationMinutes: 79, startSoc: 12, endSoc: 92, startMeterReading: 38521.08, endMeterReading: 38586.72, energy: 65.64, electricityFee: 55.79, serviceFee: 23.63, parkingFee: 0,
    discountAmount: 6.35, payableAmount: 73.07, paidAmount: 73.07, paymentStatus: 'paid', paymentMethod: '企业余额', paymentTransactionNo: 'BAL2026071421450862', paidAt: '2026-07-14T13:45:42.000Z', couponName: '签约客户折扣', stopReason: '用户主动结束充电',
  },
  {
    id: 'order-005', orderCode: 'CD202607140011', status: 'refunded', userName: '陈女士', userMobile: '177****8893', vehiclePlate: '豫B·V3381',
    stationName: '开封北站充电站', stationCode: 'S41020003', deviceCode: 'DC-KF-006', connectorCode: 'B枪', startTime: '2026-07-14T06:08:00.000Z', endTime: '2026-07-14T06:31:00.000Z',
    durationMinutes: 23, startSoc: 46, endSoc: 59, startMeterReading: 12872.51, endMeterReading: 12881.93, energy: 9.42, electricityFee: 8.48, serviceFee: 3.77, parkingFee: 0,
    discountAmount: 0, payableAmount: 12.25, paidAmount: 0, paymentStatus: 'refunded', paymentMethod: '储值余额', paymentTransactionNo: 'BAL2026071414312205', paidAt: '2026-07-14T06:32:10.000Z', stopReason: '设备异常停止', refundedAt: '2026-07-14T07:15:30.000Z', refundReason: '充电过程中设备故障，订单全额退款',
  },
  {
    id: 'order-006', orderCode: 'CD202607140006', status: 'cancelled', userName: '刘先生', userMobile: '135****3046', vehiclePlate: '豫C·E7260',
    stationName: '洛阳龙门充电站', stationCode: 'S41030004', deviceCode: 'DC-LY-025', connectorCode: 'A枪', startTime: '2026-07-14T02:20:00.000Z', endTime: '2026-07-14T02:21:00.000Z',
    durationMinutes: 1, startSoc: 67, endSoc: 67, startMeterReading: 7240.16, endMeterReading: 7240.16, energy: 0, electricityFee: 0, serviceFee: 0, parkingFee: 0,
    discountAmount: 0, payableAmount: 0, paidAmount: 0, paymentStatus: 'unpaid', stopReason: '车辆未启动充电，订单自动取消',
  },
  {
    id: 'order-007', orderCode: 'CD202607130027', status: 'completed', userName: '赵女士', userMobile: '188****7159', vehiclePlate: '豫A·F9052',
    stationName: '郑州高新区充电站', stationCode: 'S41010001', deviceCode: 'DC-ZZ-028', connectorCode: 'B枪', startTime: '2026-07-13T13:12:00.000Z', endTime: '2026-07-13T14:24:00.000Z',
    durationMinutes: 72, startSoc: 21, endSoc: 93, startMeterReading: 19822.34, endMeterReading: 19878.49, energy: 56.15, electricityFee: 47.73, serviceFee: 20.21, parkingFee: 5,
    discountAmount: 15, payableAmount: 57.94, paidAmount: 57.94, paymentStatus: 'paid', paymentMethod: '微信支付', paymentTransactionNo: 'WX2026071322245781', paidAt: '2026-07-13T14:25:03.000Z', couponName: '会员专享满减券', stopReason: '用户主动结束充电',
  },
  {
    id: 'order-008', orderCode: 'CD202607130019', status: 'completed', userName: '河南远通物流有限公司', userMobile: '0371****3057', vehiclePlate: '豫A·L5932',
    stationName: '郑州高新区充电站', stationCode: 'S41010001', deviceCode: 'DC-ZZ-015', connectorCode: 'A枪', startTime: '2026-07-13T08:35:00.000Z', endTime: '2026-07-13T10:02:00.000Z',
    durationMinutes: 87, startSoc: 9, endSoc: 88, startMeterReading: 31207.86, endMeterReading: 31283.21, energy: 75.35, electricityFee: 64.05, serviceFee: 27.13, parkingFee: 0,
    discountAmount: 7.29, payableAmount: 83.89, paidAmount: 83.89, paymentStatus: 'paid', paymentMethod: '企业余额', paymentTransactionNo: 'BAL2026071318024077', paidAt: '2026-07-13T10:02:40.000Z', couponName: '签约客户折扣', stopReason: '车辆达到设定电量',
  },
]

export function getChargingOrders(): readonly ChargingOrder[] {
  return orders
}

export function getChargingOrder(orderId: string): ChargingOrder | undefined {
  return orders.find((order) => order.id === orderId)
}

export function getChargingOrderStatusLabel(status: ChargingOrderStatus): string {
  return chargingOrderStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return paymentStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatOrderDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '—'
}

export function formatOrderCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

export function formatChargingDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0 ? `${hours} 小时 ${remainingMinutes} 分钟` : `${remainingMinutes} 分钟`
}
