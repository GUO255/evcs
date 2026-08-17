import type { ChargingProvider } from './providers/types'

export interface ChargingServiceOptions {
  provider: ChargingProvider
}

export function createChargingServiceHandler(options: ChargingServiceOptions): (request: Request) => Promise<Response> {
  const { provider } = options

  return async function handle(request: Request): Promise<Response> {
    const response = await route(request)
    return applyCors(response)
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname
    const method = request.method

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204 })
    }

    if (method === 'GET' && pathname === '/health') {
      return Response.json({ ok: true, app: 'charging-service' })
    }

    if (method === 'POST' && pathname === '/api/mini-program/login') {
      return Response.json({ token: 'dev-token-charging-mini-program', user: await provider.getUser() })
    }

    if (method === 'GET' && pathname === '/api/mini-program/me') {
      return Response.json(await provider.getUser())
    }

    if (method === 'GET' && pathname === '/api/mini-program/wallet') {
      return Response.json(await provider.getWallet())
    }

    if (method === 'GET' && pathname === '/api/mini-program/vehicles') {
      return Response.json(await provider.listVehicles())
    }

    if (method === 'POST' && pathname === '/api/mini-program/vehicles') {
      const body = await readJson(request)
      if (!isVehicleInput(body)) return error('invalid_request', 400)
      try {
        return Response.json(await provider.createVehicle(body), { status: 201 })
      } catch (createError) {
        return error(createError instanceof Error ? createError.message : 'invalid_vehicle', 400)
      }
    }

    const vehicleMatch = pathname.match(/^\/api\/mini-program\/vehicles\/([^/]+)$/u)
    if (method === 'DELETE' && vehicleMatch) {
      return Response.json({ deleted: await provider.deleteVehicle(vehicleMatch[1]!) })
    }

    if (method === 'POST' && pathname === '/api/mini-program/stored-value/orders') {
      const body = await readJson(request)
      if (!body || typeof body.amount !== 'number') return error('invalid_request', 400)
      try {
        return Response.json(await provider.createStoredValueOrder(body.amount), { status: 201 })
      } catch (createError) {
        return error(createError instanceof Error ? createError.message : 'invalid_amount', 400)
      }
    }

    const storedValuePayMatch = pathname.match(/^\/api\/mini-program\/stored-value\/orders\/([^/]+)\/pay$/u)
    if (method === 'POST' && storedValuePayMatch) {
      const order = await provider.payStoredValueOrder(storedValuePayMatch[1]!)
      if (!order) return error('stored_value_order_not_found', 404)
      return Response.json(order)
    }

    if (method === 'GET' && pathname === '/api/mini-program/stations') {
      const latitude = parseOptionalNumber(url.searchParams.get('latitude'))
      const longitude = parseOptionalNumber(url.searchParams.get('longitude'))
      const keyword = url.searchParams.get('keyword') ?? undefined
      const stations = await provider.listStations({ latitude, longitude, keyword })
      return Response.json(stations)
    }

    const stationMatch = pathname.match(/^\/api\/mini-program\/stations\/([^/]+)$/u)
    if (method === 'GET' && stationMatch) {
      const station = await provider.getStation(stationMatch[1]!)
      if (!station) return error('station_not_found', 404)
      return Response.json(station)
    }

    const connectorsMatch = pathname.match(/^\/api\/mini-program\/stations\/([^/]+)\/connectors$/u)
    if (method === 'GET' && connectorsMatch) {
      return Response.json(await provider.getConnectors(connectorsMatch[1]!))
    }

    if (method === 'POST' && pathname === '/api/mini-program/charge/sessions') {
      const body = await readJson(request)
      if (!body || typeof body.connectorId !== 'string') return error('invalid_request', 400)
      try {
        return Response.json(await provider.startCharge(body.connectorId, { connectorId: body.connectorId }), { status: 201 })
      } catch (startError) {
        return error(startError instanceof Error ? startError.message : 'start_failed', 409)
      }
    }

    const sessionMatch = pathname.match(/^\/api\/mini-program\/charge\/sessions\/([^/]+)$/u)
    if (method === 'GET' && sessionMatch) {
      const session = await provider.getSession(sessionMatch[1]!)
      if (!session) return error('session_not_found', 404)
      return Response.json(session)
    }

    const stopMatch = pathname.match(/^\/api\/mini-program\/charge\/sessions\/([^/]+)\/stop$/u)
    if (method === 'POST' && stopMatch) {
      const session = await provider.stopCharge(stopMatch[1]!)
      if (!session) return error('session_not_found', 404)
      return Response.json(session)
    }

    if (method === 'GET' && pathname === '/api/mini-program/orders') {
      return Response.json(await provider.listOrders())
    }

    const orderPayMatch = pathname.match(/^\/api\/mini-program\/orders\/([^/]+)\/pay$/u)
    if (method === 'POST' && orderPayMatch) {
      const body = await readJson(request)
      if (!isPaymentMethod(body?.paymentMethod)) return error('invalid_request', 400)
      try {
        const order = await provider.payOrder(orderPayMatch[1]!, body.paymentMethod)
        if (!order) return error('order_not_found', 404)
        return Response.json(order)
      } catch (payError) {
        return error(payError instanceof Error ? payError.message : 'pay_failed', 409)
      }
    }

    const orderRefundMatch = pathname.match(/^\/api\/mini-program\/orders\/([^/]+)\/refund$/u)
    if (method === 'POST' && orderRefundMatch) {
      const order = await provider.refundOrder(orderRefundMatch[1]!)
      if (!order) return error('order_not_found', 404)
      return Response.json(order)
    }

    const orderMatch = pathname.match(/^\/api\/mini-program\/orders\/([^/]+)$/u)
    if (method === 'GET' && orderMatch) {
      const order = await provider.getOrder(orderMatch[1]!)
      if (!order) return error('order_not_found', 404)
      return Response.json(order)
    }

    return error('not_found', 404)
  }
}

function error(code: string, status: number): Response {
  return Response.json({ error: code }, { status })
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json()
    return value && typeof value === 'object' ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

function applyCors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('access-control-allow-origin', '*')
  headers.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS')
  headers.set('access-control-allow-headers', 'content-type, authorization')
  return new Response(response.body, { status: response.status, headers })
}

function isVehicleInput(body: Record<string, unknown> | null): body is { plate: string; brand: string; model: string } {
  return !!body
    && typeof body.plate === 'string'
    && typeof body.brand === 'string'
    && typeof body.model === 'string'
}

function isPaymentMethod(value: unknown): value is 'balance' | 'wechat' {
  return value === 'balance' || value === 'wechat'
}
