import { mockOrders, mockStations, mockUser, mockVehicles } from '../data/mock-data'
import type {
  ChargingConnector,
  ChargingOrder,
  ChargingSession,
  ChargingStationDetail,
  ChargingStationSummary,
  MiniProgramUser,
  PaymentMethod,
  StartChargeInput,
  StoredValueOrder,
  Vehicle,
  Wallet,
} from '../types'
import type { ChargingProvider, StationQuery } from './types'

export interface MockChargingProviderOptions {
  now?: () => Date
}

export class MockChargingProvider implements ChargingProvider {
  private readonly sessions = new Map<string, ChargingSession>()
  private readonly orders = new Map<string, ChargingOrder>(
    mockOrders.map((order) => [order.id, { ...order }]),
  )
  private readonly storedValueOrders = new Map<string, StoredValueOrder>()
  private readonly vehicles = new Map<string, Vehicle>(
    mockVehicles.map((vehicle) => [vehicle.id, { ...vehicle }]),
  )
  private readonly now: () => Date
  private balance = mockUser.balance
  private totalRecharged = 0
  private orderSequence = 100

  constructor(options: MockChargingProviderOptions = {}) {
    this.now = options.now ?? (() => new Date())
  }

  async listStations(query: StationQuery): Promise<ChargingStationSummary[]> {
    let stations = mockStations.map(toSummary)
    if (query.keyword) {
      const keyword = query.keyword.trim().toLowerCase()
      stations = stations.filter((station) =>
        station.name.toLowerCase().includes(keyword) ||
        station.address.toLowerCase().includes(keyword),
      )
    }
    return stations.sort((left, right) => left.distanceKm - right.distanceKm)
  }

  async getStation(stationId: string): Promise<ChargingStationDetail | null> {
    const station = mockStations.find((candidate) => candidate.id === stationId)
    return station ? { ...station, connectors: [...station.connectors] } : null
  }

  async getConnectors(stationId: string): Promise<ChargingConnector[]> {
    const station = mockStations.find((candidate) => candidate.id === stationId)
    return station ? station.connectors.map((connector) => ({ ...connector })) : []
  }

  async startCharge(connectorId: string, _input: StartChargeInput): Promise<ChargingSession> {
    const connector = findConnector(connectorId)
    if (!connector) throw new Error('connector_not_found')
    if (connector.status !== 'idle') throw new Error('connector_unavailable')

    const startedAt = this.now()
    const session: ChargingSession = {
      id: `session-${crypto.randomUUID()}`,
      stationId: connector.stationId,
      connectorId: connector.id,
      connectorCode: connector.code,
      status: 'charging',
      startedAt: startedAt.toISOString(),
      updatedAt: startedAt.toISOString(),
      startSoc: 28,
      currentSoc: 28,
      energyKwh: 0,
      powerKw: connector.powerKw,
      electricityFee: 0,
      serviceFee: 0,
      totalFee: 0,
    }
    this.sessions.set(session.id, session)
    connector.status = 'charging'
    return session
  }

  async getSession(sessionId: string): Promise<ChargingSession | null> {
    const session = this.sessions.get(sessionId)
    return session ? this.refreshSession(session) : null
  }

  async stopCharge(sessionId: string): Promise<ChargingSession | null> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'charging') return session ?? null
    const stopped = this.refreshSession(session)
    stopped.status = 'stopped'
    stopped.updatedAt = this.now().toISOString()
    const connector = findConnector(stopped.connectorId)
    if (connector) connector.status = 'idle'
    this.createOrderFromSession(stopped)
    return stopped
  }

  async listOrders(): Promise<ChargingOrder[]> {
    return [...this.orders.values()]
      .map((order) => ({ ...order }))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
  }

  async getOrder(orderId: string): Promise<ChargingOrder | null> {
    const order = this.orders.get(orderId)
    return order ? { ...order } : null
  }

  async payOrder(orderId: string, paymentMethod: PaymentMethod): Promise<ChargingOrder | null> {
    const order = this.orders.get(orderId)
    if (!order || order.status !== 'pending-payment') return order ? { ...order } : null
    if (paymentMethod === 'balance') {
      if (this.balance < order.totalFee) throw new Error('insufficient_balance')
      this.balance = round2(this.balance - order.totalFee)
    }
    order.status = 'paid'
    order.paymentMethod = paymentMethod
    order.paidAt = this.now().toISOString()
    return { ...order }
  }

  async refundOrder(orderId: string): Promise<ChargingOrder | null> {
    const order = this.orders.get(orderId)
    if (!order || order.status !== 'paid') return order ? { ...order } : null
    order.status = 'refunded'
    order.refundedAt = this.now().toISOString()
    this.balance = round2(this.balance + order.totalFee)
    return { ...order }
  }

  async getUser(): Promise<MiniProgramUser> {
    return { ...mockUser, balance: round2(this.balance) }
  }

  async getWallet(): Promise<Wallet> {
    return {
      balance: round2(this.balance),
      totalRecharged: round2(this.totalRecharged),
      storedValueOrders: [...this.storedValueOrders.values()]
        .map((order) => ({ ...order }))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    }
  }

  async createStoredValueOrder(amount: number): Promise<StoredValueOrder> {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_amount')
    const createdAt = this.now().toISOString()
    const order: StoredValueOrder = {
      id: `stored-value-${crypto.randomUUID()}`,
      orderCode: `CZ${createdAt.replace(/\D/g, '').slice(0, 14)}`,
      amount: round2(amount),
      status: 'pending',
      createdAt,
    }
    this.storedValueOrders.set(order.id, order)
    return { ...order }
  }

  async payStoredValueOrder(orderId: string): Promise<StoredValueOrder | null> {
    const order = this.storedValueOrders.get(orderId)
    if (!order || order.status !== 'pending') return order ? { ...order } : null
    order.status = 'paid'
    order.paidAt = this.now().toISOString()
    this.balance = round2(this.balance + order.amount)
    this.totalRecharged = round2(this.totalRecharged + order.amount)
    return { ...order }
  }

  async listVehicles(): Promise<Vehicle[]> {
    return [...this.vehicles.values()].map((vehicle) => ({ ...vehicle }))
  }

  async createVehicle(input: { plate: string; brand: string; model: string }): Promise<Vehicle> {
    const plate = input.plate.trim()
    const brand = input.brand.trim()
    const model = input.model.trim()
    if (!plate || !brand || !model) throw new Error('invalid_vehicle')
    const vehicle: Vehicle = {
      id: `vehicle-${crypto.randomUUID()}`,
      plate,
      brand,
      model,
    }
    this.vehicles.set(vehicle.id, vehicle)
    return { ...vehicle }
  }

  async deleteVehicle(vehicleId: string): Promise<boolean> {
    return this.vehicles.delete(vehicleId)
  }

  private createOrderFromSession(session: ChargingSession): void {
    if (session.totalFee <= 0) return
    const station = mockStations.find((candidate) => candidate.id === session.stationId)
    const now = this.now()
    const order: ChargingOrder = {
      id: `order-${this.orderSequence++}`,
      orderCode: `CD${now.toISOString().replace(/\D/g, '').slice(0, 14)}`,
      stationName: station?.name ?? '未知场站',
      connectorCode: session.connectorCode,
      startedAt: session.startedAt,
      endedAt: session.updatedAt,
      energyKwh: session.energyKwh,
      totalFee: session.totalFee,
      status: 'pending-payment',
    }
    this.orders.set(order.id, order)
  }

  private refreshSession(session: ChargingSession): ChargingSession {
    if (session.status !== 'charging') return session
    const now = this.now()
    const elapsedHours = Math.max(0, (now.getTime() - new Date(session.startedAt).getTime()) / 3_600_000)
    const energyKwh = round2(session.powerKw * elapsedHours)
    const currentSoc = Math.min(92, session.startSoc + Math.round(energyKwh / 0.6))
    const electricityFee = round2(energyKwh * 0.78)
    const serviceFee = round2(energyKwh * 0.5)
    return {
      ...session,
      energyKwh,
      currentSoc,
      electricityFee,
      serviceFee,
      totalFee: round2(electricityFee + serviceFee),
      updatedAt: now.toISOString(),
    }
  }
}

function findConnector(connectorId: string): ChargingConnector | undefined {
  return mockStations.flatMap((station) => station.connectors).find((connector) => connector.id === connectorId)
}

function toSummary(station: ChargingStationDetail): ChargingStationSummary {
  return {
    id: station.id,
    name: station.name,
    address: station.address,
    latitude: station.latitude,
    longitude: station.longitude,
    distanceKm: station.distanceKm,
    fastAvailable: station.connectors.filter((connector) => connector.type === 'dc' && connector.status === 'idle').length,
    slowAvailable: station.connectors.filter((connector) => connector.type === 'ac' && connector.status === 'idle').length,
    priceDesc: station.priceDesc,
    operatorName: station.operatorName,
    tags: station.tags,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function getMockUser(): MiniProgramUser {
  return { ...mockUser }
}
