import Taro from '@tarojs/taro'

import type {
  ChargingConnector,
  ChargingOrder,
  ChargingSession,
  ChargingStationDetail,
  ChargingStationSummary,
  MiniProgramUser,
  PaymentMethod,
  StoredValueOrder,
  Vehicle,
  Wallet,
} from '../types'

const BASE_URL = 'http://127.0.0.1:3241'
const TOKEN_KEY = 'charging_mini_program_token'

export async function ensureLogin(): Promise<void> {
  const token = Taro.getStorageSync(TOKEN_KEY)
  if (token) return
  const login = await request<{ token: string }>('/api/mini-program/login', { method: 'POST' })
  Taro.setStorageSync(TOKEN_KEY, login.token)
}

export async function listStations(keyword = ''): Promise<ChargingStationSummary[]> {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return request<ChargingStationSummary[]>(`/api/mini-program/stations${query}`)
}

export async function getStation(stationId: string): Promise<ChargingStationDetail> {
  return request<ChargingStationDetail>(`/api/mini-program/stations/${stationId}`)
}

export async function getConnectors(stationId: string): Promise<ChargingConnector[]> {
  return request<ChargingConnector[]>(`/api/mini-program/stations/${stationId}/connectors`)
}

export async function startCharge(connectorId: string): Promise<ChargingSession> {
  return request<ChargingSession>('/api/mini-program/charge/sessions', {
    method: 'POST',
    data: { connectorId },
  })
}

export async function getSession(sessionId: string): Promise<ChargingSession> {
  return request<ChargingSession>(`/api/mini-program/charge/sessions/${sessionId}`)
}

export async function stopCharge(sessionId: string): Promise<ChargingSession> {
  return request<ChargingSession>(`/api/mini-program/charge/sessions/${sessionId}/stop`, {
    method: 'POST',
  })
}

export async function listOrders(): Promise<ChargingOrder[]> {
  return request<ChargingOrder[]>('/api/mini-program/orders')
}

export async function getOrder(orderId: string): Promise<ChargingOrder> {
  return request<ChargingOrder>(`/api/mini-program/orders/${orderId}`)
}

export async function payOrder(orderId: string, paymentMethod: PaymentMethod): Promise<ChargingOrder> {
  return request<ChargingOrder>(`/api/mini-program/orders/${orderId}/pay`, {
    method: 'POST',
    data: { paymentMethod },
  })
}

export async function refundOrder(orderId: string): Promise<ChargingOrder> {
  return request<ChargingOrder>(`/api/mini-program/orders/${orderId}/refund`, {
    method: 'POST',
  })
}

export async function getMe(): Promise<MiniProgramUser> {
  return request<MiniProgramUser>('/api/mini-program/me')
}

export async function getWallet(): Promise<Wallet> {
  return request<Wallet>('/api/mini-program/wallet')
}

export async function createStoredValueOrder(amount: number): Promise<StoredValueOrder> {
  return request<StoredValueOrder>('/api/mini-program/stored-value/orders', {
    method: 'POST',
    data: { amount },
  })
}

export async function payStoredValueOrder(orderId: string): Promise<StoredValueOrder> {
  return request<StoredValueOrder>(`/api/mini-program/stored-value/orders/${orderId}/pay`, {
    method: 'POST',
  })
}

export async function listVehicles(): Promise<Vehicle[]> {
  return request<Vehicle[]>('/api/mini-program/vehicles')
}

export async function createVehicle(input: { plate: string; brand: string; model: string }): Promise<Vehicle> {
  return request<Vehicle>('/api/mini-program/vehicles', {
    method: 'POST',
    data: input,
  })
}

export async function deleteVehicle(vehicleId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/mini-program/vehicles/${vehicleId}`, {
    method: 'DELETE',
  })
}

async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'DELETE'; data?: unknown } = {}): Promise<T> {
  const response = await Taro.request<T>({
    url: `${BASE_URL}${path}`,
    method: options.method ?? 'GET',
    data: options.data,
    header: {
      'content-type': 'application/json',
      authorization: `Bearer ${Taro.getStorageSync(TOKEN_KEY)}`,
    },
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`request_failed_${response.statusCode}`)
  }
  return response.data
}
