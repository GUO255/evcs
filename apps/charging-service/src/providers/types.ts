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

export interface StationQuery {
  keyword?: string
  latitude?: number
  longitude?: number
}

export interface ChargingProvider {
  listStations(query: StationQuery): Promise<ChargingStationSummary[]>
  getStation(stationId: string): Promise<ChargingStationDetail | null>
  getConnectors(stationId: string): Promise<ChargingConnector[]>
  startCharge(connectorId: string, input: StartChargeInput): Promise<ChargingSession>
  getSession(sessionId: string): Promise<ChargingSession | null>
  stopCharge(sessionId: string): Promise<ChargingSession | null>
  listOrders(): Promise<ChargingOrder[]>
  getOrder(orderId: string): Promise<ChargingOrder | null>
  payOrder(orderId: string, paymentMethod: PaymentMethod): Promise<ChargingOrder | null>
  refundOrder(orderId: string): Promise<ChargingOrder | null>
  getUser(): Promise<MiniProgramUser>
  getWallet(): Promise<Wallet>
  createStoredValueOrder(amount: number): Promise<StoredValueOrder>
  payStoredValueOrder(orderId: string): Promise<StoredValueOrder | null>
  listVehicles(): Promise<Vehicle[]>
  createVehicle(input: { plate: string; brand: string; model: string }): Promise<Vehicle>
  deleteVehicle(vehicleId: string): Promise<boolean>
}
