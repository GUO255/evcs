import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { clearPlatformAccountQueries } from '@/features/auth/platform-identity-query'
import { queryClient } from '@/lib/query-client'

import {
  type BrowserSession,
  loadBrowserSession,
  logoutBrowserSession,
  subscribeBrowserSessionInvalidation,
} from './browser-auth-client'

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable'

interface AuthLifecycle {
  readonly session: BrowserSession | null
  readonly sessionStatus: SessionStatus
  restartLogin(returnPath?: string): void
  reloadSession(): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthLifecycle | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BrowserSession | null>(null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading')

  const markUnauthenticated = useCallback(() => {
    clearPlatformAccountQueries(queryClient)
    setSession(null)
    setSessionStatus('unauthenticated')
  }, [])

  const reloadSession = useCallback(async () => {
    setSessionStatus('loading')
    try {
      const nextSession = await loadBrowserSession()
      if (!nextSession) {
        markUnauthenticated()
        return
      }
      setSession(nextSession)
      setSessionStatus('authenticated')
    } catch {
      setSession(null)
      setSessionStatus('unavailable')
    }
  }, [markUnauthenticated])

  useEffect(() => {
    void reloadSession()
  }, [reloadSession])

  useEffect(() => subscribeBrowserSessionInvalidation(markUnauthenticated), [markUnauthenticated])

  const restartLogin = useCallback((returnPath?: string) => {
    const loginUrl = new URL('/auth/login', window.location.origin)
    loginUrl.searchParams.set('returnTo', sanitizeReturnPath(returnPath ?? `${window.location.pathname}${window.location.search}`))
    window.location.assign(loginUrl)
  }, [])

  const logout = useCallback(async () => {
    clearPlatformAccountQueries(queryClient)
    const result = await logoutBrowserSession()
    setSession(null)
    setSessionStatus('unauthenticated')
    window.location.assign(result.authLogoutUrl ?? '/auth/login?prompt=login')
  }, [])

  const value = useMemo(
    () => ({ session, sessionStatus, restartLogin, reloadSession, logout }),
    [session, sessionStatus, restartLogin, reloadSession, logout],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthLifecycle {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function sanitizeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  try {
    const url = new URL(value, 'https://platform.invalid')
    return url.origin === 'https://platform.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/'
  } catch {
    return '/'
  }
}
