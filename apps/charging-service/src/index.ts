import { createChargingServiceHandler } from './app'
import { MockChargingProvider } from './providers/mock-provider'

const port = parsePort(process.env.CHARGING_SERVICE_PORT ?? '3241')
const hostname = process.env.CHARGING_SERVICE_HOST ?? '0.0.0.0'
const provider = new MockChargingProvider()
const handler = createChargingServiceHandler({ provider })

const server = Bun.serve({
  port,
  hostname,
  fetch: handler,
})

console.log(`[charging-service] listening on http://${hostname}:${server.port} (mock provider)`)

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('CHARGING_SERVICE_PORT must be an integer')
  const port = Number(value)
  if (port < 1 || port > 65535) throw new Error('CHARGING_SERVICE_PORT must be between 1 and 65535')
  return port
}
