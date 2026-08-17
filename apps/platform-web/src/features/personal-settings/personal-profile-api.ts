import { authenticatedFetch, platformGatewayBase } from '@/auth/browser-auth-client'
import { PlatformApiError } from '@/features/auth/platform-identity-query'

interface PersonalProfile {
  id: string
  realName: string
}

function isPersonalProfile(value: unknown): value is PersonalProfile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const validId = typeof record.id === 'string'
    && /^[1-9]\d{0,19}$/.test(record.id)
    && BigInt(record.id) <= 18_446_744_073_709_551_615n
  return keys.length === 2
    && keys[0] === 'id'
    && keys[1] === 'realName'
    && validId
    && typeof record.realName === 'string'
    && record.realName.length > 0
    && record.realName.length <= 64
}

export async function updatePersonalProfile(realName: string): Promise<PersonalProfile> {
  const response = await authenticatedFetch(`${platformGatewayBase}/api/me`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ realName }),
  })
  if (!response.ok) {
    let code: string | undefined
    try {
      const body = await response.json() as unknown
      if (typeof body === 'object' && body !== null && !Array.isArray(body) && typeof (body as { error?: unknown }).error === 'string') {
        code = (body as { error: string }).error
      }
    } catch {
      // The stable status fallback below is sufficient when the response is not JSON.
    }
    throw new PlatformApiError(response.status, code)
  }

  const body = await response.json() as unknown
  if (!isPersonalProfile(body)) throw new PlatformApiError(502, 'malformed_response')
  return body
}

export function personalProfileErrorMessage(error: unknown): string {
  if (!(error instanceof PlatformApiError)) return '保存失败，请稍后重试。'
  if (error.code === 'invalid_request') return '用户名称须为 1–64 个字符。'
  if (error.status === 403) return '当前账号无法修改个人资料。'
  return '保存失败，请稍后重试。'
}
