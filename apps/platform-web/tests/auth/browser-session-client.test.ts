import { afterEach, describe, expect, test } from 'bun:test'

import {
  authenticatedFetch,
  authenticatedUpload,
  loadBrowserSession,
  logoutBrowserSession,
  platformGatewayBase,
  siteSelectionGatewayBase,
  subscribeBrowserSessionInvalidation,
} from '../../src/auth/browser-auth-client'

const originalFetch = globalThis.fetch
const originalXmlHttpRequest = globalThis.XMLHttpRequest

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.XMLHttpRequest = originalXmlHttpRequest
})

describe('browser session client', () => {
  test('uses fixed same-origin gateway bases', () => {
    expect(platformGatewayBase).toBe('/gateway/platform')
    expect(siteSelectionGatewayBase).toBe('/gateway/site-selection')
  })

  test('uses same-origin credentials without bearer tokens or 401 replay', async () => {
    const requests: Request[] = []
    const credentials: RequestCredentials[] = []
    globalThis.fetch = async (input, init) => {
      credentials.push(init?.credentials ?? 'same-origin')
      requests.push(new Request(input instanceof Request ? input : new URL(String(input), 'https://platform.example'), init))
      return new Response(null, { status: 401 })
    }
    let invalidations = 0
    const unsubscribe = subscribeBrowserSessionInvalidation(() => { invalidations += 1 })

    const response = await authenticatedFetch('/gateway/platform/api/me', {
      headers: { authorization: 'Bearer browser-token', 'x-request-id': 'request-1' },
    })
    unsubscribe()

    expect(response.status).toBe(401)
    expect(requests).toHaveLength(1)
    expect(credentials).toEqual(['same-origin'])
    expect(requests[0]?.headers.has('authorization')).toBe(false)
    expect(requests[0]?.headers.get('x-request-id')).toBe('request-1')
    expect(invalidations).toBe(1)
  })

  test('loads session metadata and maps 401 to unauthenticated', async () => {
    globalThis.fetch = async () => Response.json({ authenticated: true, expiresAt: '2026-09-01T00:00:00.000Z' })
    expect(await loadBrowserSession()).toEqual({ authenticated: true, expiresAt: '2026-09-01T00:00:00.000Z' })

    globalThis.fetch = async () => Response.json({ error: 'unauthenticated' }, { status: 401 })
    expect(await loadBrowserSession()).toBeNull()
  })

  test('logs out with an exact-origin mutation and validates the response', async () => {
    let request: Request | undefined
    let credentials: RequestCredentials | undefined
    globalThis.fetch = async (input, init) => {
      credentials = init?.credentials
      request = new Request(input instanceof Request ? input : new URL(String(input), 'https://platform.example'), init)
      return Response.json({ authLogoutUrl: 'https://auth.example/platform/sign-out' })
    }

    expect(await logoutBrowserSession()).toEqual({ authLogoutUrl: 'https://auth.example/platform/sign-out' })
    expect(request?.method).toBe('POST')
    expect(credentials).toBe('same-origin')
  })

  test('completes local logout when the BFF session is already absent', async () => {
    globalThis.fetch = async () => Response.json({ error: 'unauthenticated' }, { status: 401 })
    let invalidations = 0
    const unsubscribe = subscribeBrowserSessionInvalidation(() => { invalidations += 1 })

    expect(await logoutBrowserSession()).toEqual({ authLogoutUrl: null })
    unsubscribe()
    expect(invalidations).toBe(1)
  })

  test('uploads with cookies and without setting an authorization header', async () => {
    const headers: string[] = []
    let withCredentials = false
    class FakeXmlHttpRequest {
      status = 200
      statusText = 'OK'
      responseText = '{}'
      upload = new EventTarget()
      private readonly events = new EventTarget()
      set withCredentials(value: boolean) { withCredentials = value }
      open() {}
      setRequestHeader(name: string) { headers.push(name.toLowerCase()) }
      addEventListener(name: string, listener: EventListenerOrEventListenerObject) { this.events.addEventListener(name, listener) }
      getAllResponseHeaders() { return 'content-type: application/json' }
      send() { this.events.dispatchEvent(new Event('load')) }
    }
    globalThis.XMLHttpRequest = FakeXmlHttpRequest as unknown as typeof XMLHttpRequest

    expect((await authenticatedUpload('/gateway/site-selection/api/upload', new FormData())).status).toBe(200)
    expect(withCredentials).toBe(true)
    expect(headers).not.toContain('authorization')
  })
})
