export type ConnectorType = 'dc' | 'ac'
export type ConnectorStatus = 'idle' | 'charging' | 'offline'
export type ChargingSessionStatus = 'charging' | 'completed' | 'stopped'
export type ChargingOrderStatus = 'pending-payment' | 'paid' | 'refunded'
export type PaymentMethod = 'balance' | 'wechat'
export type StoredValueOrderStatus = 'pending' | 'paid' | 'refunded'

export interface ChargingStationSummary {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  distanceKm: number
  fastAvailable: number
  slowAvailable: number
  priceDesc: string
  operatorName: string
  tags: string[]
}

export interface ChargingConnector {
  id: string
  stationId: string
  code: string
  type: ConnectorType
  powerKw: number
  status: ConnectorStatus
  electricityFeePerKwh: number
  serviceFeePerKwh: number
}

export interface ChargingStationDetail extends ChargingStationSummary {
  images: string[]
  businessHours: string
  parkFee: string
  connectors: ChargingConnector[]
}

export interface ChargingSession {
  id: string
  stationId: string
  connectorId: string
  connectorCode: string
  status: ChargingSessionStatus
  startedAt: string
  updatedAt: string
  startSoc: number
  currentSoc: number
  energyKwh: number
  powerKw: number
  electricityFee: number
  serviceFee: number
  totalFee: number
}

export interface ChargingOrder {
  id: string
  orderCode: string
  stationName: string
  connectorCode: string
  startedAt: string
  endedAt: string
  energyKwh: number
  totalFee: number
  status: ChargingOrderStatus
  paymentMethod?: PaymentMethod
  paidAt?: string
  refundedAt?: string
}

export interface MiniProgramUser {
  id: string
  nickname: string
  phone: string
  balance: number
}

export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
}

export interface StoredValueOrder {
  id: string
  orderCode: string
  amount: number
  status: StoredValueOrderStatus
  createdAt: string
  paidAt?: string
}

export interface Wallet {
  balance: number
  totalRecharged: number
  storedValueOrders: StoredValueOrder[]
}

export interface StartChargeInput {
  connectorId: string
}
