export const platformGatewayBase = '/gateway/platform'
export const siteSelectionGatewayBase = '/gateway/site-selection'

export interface BrowserSession {
  readonly authenticated: true
  readonly expiresAt: string
}

type SessionInvalidationListener = () => void

const invalidationListeners = new Set<SessionInvalidationListener>()

export function subscribeBrowserSessionInvalidation(listener: SessionInvalidationListener): () => void {
  invalidationListeners.add(listener)
  return () => invalidationListeners.delete(listener)
}

function invalidateBrowserSession(): void {
  for (const listener of invalidationListeners) listener()
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  headers.delete('authorization')
  const response = await fetch(input, { ...init, headers, credentials: 'same-origin' })
  if (response.status === 401) invalidateBrowserSession()
  return response
}

export async function authenticatedUpload(
  url: string,
  body: FormData,
  onProgress?: (progress: number) => void,
): Promise<Response> {
  const response = await upload(url, body, onProgress)
  if (response.status === 401) invalidateBrowserSession()
  return response
}

export async function loadBrowserSession(): Promise<BrowserSession | null> {
  const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('browser_session_unavailable')
  const value: unknown = await response.json()
  if (!isBrowserSession(value)) throw new Error('malformed_browser_session')
  return value
}

export async function logoutBrowserSession(): Promise<{ authLogoutUrl: string | null }> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })
  if (response.status === 401) {
    invalidateBrowserSession()
    return { authLogoutUrl: null }
  }
  if (!response.ok) throw new Error('browser_logout_failed')
  const value: unknown = await response.json()
  if (!isRecord(value) || typeof value.authLogoutUrl !== 'string' || !isHttpUrl(value.authLogoutUrl)) {
    throw new Error('malformed_browser_logout')
  }
  invalidateBrowserSession()
  return { authLogoutUrl: value.authLogoutUrl }
}

function upload(url: string, body: FormData, onProgress?: (progress: number) => void): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || event.total < 1) return
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    })
    xhr.upload.addEventListener('load', () => onProgress?.(100))
    xhr.addEventListener('load', () => {
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
      }))
    })
    xhr.addEventListener('error', () => reject(new TypeError('network_request_failed')))
    xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')))
    onProgress?.(0)
    xhr.send(body)
  })
}

function parseXhrHeaders(rawHeaders: string): Headers {
  const headers = new Headers()
  for (const line of rawHeaders.trim().split(/[\r\n]+/u)) {
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 1) continue
    headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }
  return headers
}

function isBrowserSession(value: unknown): value is BrowserSession {
  if (!isRecord(value) || value.authenticated !== true || typeof value.expiresAt !== 'string') return false
  return Object.keys(value).length === 2 && Number.isFinite(Date.parse(value.expiresAt))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}
