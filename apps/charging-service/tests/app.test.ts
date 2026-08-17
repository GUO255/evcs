import { describe, expect, test } from 'bun:test'
import { createChargingServiceHandler } from '../src/app'
import { MockChargingProvider } from '../src/providers/mock-provider'
import type {
  ChargingConnector,
  ChargingOrder,
  ChargingSession,
  ChargingStationSummary,
  Vehicle,
  Wallet,
} from '../src/types'

describe('charging-service', () => {
  const provider = new MockChargingProvider()
  const handler = createChargingServiceHandler({ provider })

  test('returns health', async () => {
    const response = await handler(new Request('http://127.0.0.1:3241/health'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, app: 'charging-service' })
  })

  test('lists stations', async () => {
    const response = await handler(new Request('http://127.0.0.1:3241/api/mini-program/stations'))
    const body = await response.json() as ChargingStationSummary[]
    expect(response.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  test('starts and stops a charge session', async () => {
    const startResponse = await handler(new Request('http://127.0.0.1:3241/api/mini-program/charge/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ connectorId: 'connector-001' }),
    }))
    expect(startResponse.status).toBe(201)
    const session = await startResponse.json() as ChargingSession
    expect(session.status).toBe('charging')

    const stopResponse = await handler(new Request(`http://127.0.0.1:3241/api/mini-program/charge/sessions/${session.id}/stop`, {
      method: 'POST',
    }))
    const stopped = await stopResponse.json() as ChargingSession
    expect(stopResponse.status).toBe(200)
    expect(stopped.status).toBe('stopped')
    expect(stopped.energyKwh).toBeGreaterThanOrEqual(0)
  })

  test('returns station connectors', async () => {
    const response = await handler(new Request('http://127.0.0.1:3241/api/mini-program/stations/station-001/connectors'))
    const body = await response.json() as ChargingConnector[]
    expect(response.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((connector) => connector.id === 'connector-001')).toBe(true)
  })

  test('creates and pays a stored value order', async () => {
    const createResponse = await handler(new Request('http://127.0.0.1:3241/api/mini-program/stored-value/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    }))
    expect(createResponse.status).toBe(201)
    const storedValueOrder = await createResponse.json() as { id: string; status: string }

    const payResponse = await handler(new Request(`http://127.0.0.1:3241/api/mini-program/stored-value/orders/${storedValueOrder.id}/pay`, {
      method: 'POST',
    }))
    expect(payResponse.status).toBe(200)
    expect(await payResponse.json()).toMatchObject({ status: 'paid', amount: 100 })

    const walletResponse = await handler(new Request('http://127.0.0.1:3241/api/mini-program/wallet'))
    const wallet = await walletResponse.json() as Wallet
    expect(wallet.balance).toBeGreaterThan(100)
  })

  test('creates and deletes a vehicle', async () => {
    const createResponse = await handler(new Request('http://127.0.0.1:3241/api/mini-program/vehicles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plate: '豫A·G12345', brand: '蔚来', model: 'ES6' }),
    }))
    expect(createResponse.status).toBe(201)
    const vehicle = await createResponse.json() as Vehicle

    const deleteResponse = await handler(new Request(`http://127.0.0.1:3241/api/mini-program/vehicles/${vehicle.id}`, {
      method: 'DELETE',
    }))
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ deleted: true })
  })

  test('pays and refunds a charging order', async () => {
    const ordersResponse = await handler(new Request('http://127.0.0.1:3241/api/mini-program/orders'))
    const orders = await ordersResponse.json() as ChargingOrder[]
    const pendingOrder = orders.find((order) => order.status === 'pending-payment') ?? orders[0]!

    const payResponse = await handler(new Request(`http://127.0.0.1:3241/api/mini-program/orders/${pendingOrder.id}/pay`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'wechat' }),
    }))
    expect(payResponse.status).toBe(200)

    const refundResponse = await handler(new Request(`http://127.0.0.1:3241/api/mini-program/orders/${pendingOrder.id}/refund`, {
      method: 'POST',
    }))
    const refunded = await refundResponse.json() as ChargingOrder
    expect(refundResponse.status).toBe(200)
    expect(refunded.status).toBe('refunded')
  })
})
