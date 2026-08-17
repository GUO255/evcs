import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

export type ExplorationTeamStatus = 'active' | 'disabled'

export type ExplorationTeam = {
  id: string
  name: string
  description: string
  status: ExplorationTeamStatus
  memberCount: number
  createdByMemberId: string
  updatedByMemberId: string
  createdAt: number
  updatedAt: number
}

export type ExplorationTeamInput = Pick<ExplorationTeam, 'name' | 'description'>

export type ExplorationTeamMember = {
  id: string
  platformMemberId: string
  code: string
  realName: string
  status: ExplorationTeamStatus
  createdByMemberId: string
  createdAt: number
}

export type ExplorationTeamMemberCandidate = {
  platformMemberId: string
  code: string
  realName: string
  status: 'active'
}

export type CursorPage<T> = { items: T[]; nextCursor: string | null }

export type ExplorationTeamListQuery = {
  limit: number
  cursor?: string
  status?: ExplorationTeamStatus
  namePrefix?: string
}

export type ExplorationTeamMemberListQuery = {
  teamId: string
  limit: number
  cursor?: string
}

export type ExplorationTeamCandidateListQuery = ExplorationTeamMemberListQuery & {
  memberId?: string
  namePrefix?: string
}

const basePath = '/api/intelligent-site-selection/exploration-teams'

export function listExplorationTeams(query: ExplorationTeamListQuery): Promise<CursorPage<ExplorationTeam>> {
  return get(`?${queryString(query)}`, parseTeamPage)
}

export function getExplorationTeam(id: string): Promise<ExplorationTeam> {
  return get(`/${encodeURIComponent(id)}`, parseTeam)
}

export function createExplorationTeam(input: ExplorationTeamInput): Promise<ExplorationTeam> {
  return mutate('', 'POST', input, parseTeam)
}

export function updateExplorationTeam(
  id: string,
  input: ExplorationTeamInput,
  expectedUpdatedAt: number,
): Promise<ExplorationTeam> {
  return mutate(`/${encodeURIComponent(id)}`, 'PATCH', { team: input, expectedUpdatedAt }, parseTeam)
}

export function setExplorationTeamStatus(
  id: string,
  status: ExplorationTeamStatus,
  expectedUpdatedAt: number,
): Promise<ExplorationTeam> {
  return mutate(`/${encodeURIComponent(id)}/status`, 'POST', { status, expectedUpdatedAt }, parseTeam)
}

export function listExplorationTeamMembers(
  query: ExplorationTeamMemberListQuery,
): Promise<CursorPage<ExplorationTeamMember>> {
  const { teamId, ...params } = query
  return get(`/${encodeURIComponent(teamId)}/members?${queryString(params)}`, (value) => parsePage(value, parseMember))
}

export function addExplorationTeamMember(teamId: string, platformMemberId: string): Promise<ExplorationTeamMember> {
  return mutate(`/${encodeURIComponent(teamId)}/members`, 'POST', { platformMemberId }, parseMember)
}

export async function removeExplorationTeamMember(teamId: string, platformMemberId: string): Promise<void> {
  await request(`/${encodeURIComponent(teamId)}/members/${encodeURIComponent(platformMemberId)}`, { method: 'DELETE' })
}

export function listExplorationTeamMemberCandidates(
  query: ExplorationTeamCandidateListQuery,
): Promise<CursorPage<ExplorationTeamMemberCandidate>> {
  return get(`/member-candidates?${queryString(query)}`, (value) => parsePage(value, parseCandidate))
}

export function explorationTeamErrorMessage(error: unknown): string | null {
  if (error instanceof ExplorationTeamApiError) return error.message
  if (error instanceof TypeError) return '网络连接失败，请稍后重试。'
  return '勘探小组数据格式异常，请联系管理员。'
}

export class ExplorationTeamApiError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, message: string) {
    super(message)
    this.name = 'ExplorationTeamApiError'
  }
}

async function get<T>(suffix: string, parser: (value: unknown) => T): Promise<T> {
  const response = await request(suffix)
  return parseJson(response, parser)
}

async function mutate<T>(
  suffix: string,
  method: 'POST' | 'PATCH',
  body: unknown,
  parser: (value: unknown) => T,
): Promise<T> {
  const response = await request(suffix, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson(response, parser)
}

async function request(suffix: string, init?: RequestInit): Promise<Response> {
  const response = await authenticatedFetch(`${siteSelectionGatewayBase}${basePath}${suffix}`, init)
  if (!response.ok) throw await parseError(response)
  return response
}

async function parseJson<T>(response: Response, parser: (value: unknown) => T): Promise<T> {
  try {
    return parser(await response.json())
  } catch (error) {
    if (error instanceof ExplorationTeamApiError) throw error
    throw new Error('malformed_exploration_team_response')
  }
}

async function parseError(response: Response): Promise<ExplorationTeamApiError> {
  let code: string | undefined
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && exactKeys(body, ['error']) && typeof body.error === 'string') code = body.error
  } catch {
    // Only bounded service error codes are used for display decisions.
  }
  const message = code === 'exploration_team_name_exists'
    ? '小组名称已存在。'
    : code === 'exploration_team_conflict'
      ? '该小组已被其他人修改，请刷新后重试。'
      : code === 'exploration_team_member_exists'
        ? '该成员已在当前小组中。'
        : code === 'exploration_team_member_unavailable'
          ? '该平台成员不存在或已停用。'
          : code === 'exploration_team_disabled'
            ? '停用小组不能新增成员。'
            : '勘探小组操作失败，请稍后重试。'
  return new ExplorationTeamApiError(response.status, code, message)
}

function parseTeamPage(value: unknown): CursorPage<ExplorationTeam> {
  return parsePage(value, parseTeam)
}

function parsePage<T>(value: unknown, parseItem: (item: unknown) => T): CursorPage<T> {
  if (
    !isRecord(value)
    || !exactKeys(value, ['items', 'nextCursor'])
    || !Array.isArray(value.items)
    || (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || value.nextCursor.length === 0))
  ) throw new Error('malformed_exploration_team_page')
  return { items: value.items.map(parseItem), nextCursor: value.nextCursor }
}

function parseTeam(value: unknown): ExplorationTeam {
  if (!isRecord(value) || !exactKeys(value, [
    'id', 'name', 'description', 'status', 'memberCount', 'createdByMemberId', 'updatedByMemberId', 'createdAt', 'updatedAt',
  ])) throw new Error('malformed_exploration_team')
  const id = parseId(value.id)
  if (
    typeof value.name !== 'string'
    || typeof value.description !== 'string'
    || !isStatus(value.status)
    || !isUnsignedInteger(value.memberCount)
    || !isUnsignedInteger(value.createdAt)
    || !isUnsignedInteger(value.updatedAt)
  ) throw new Error('malformed_exploration_team')
  return {
    id,
    name: value.name,
    description: value.description,
    status: value.status,
    memberCount: value.memberCount,
    createdByMemberId: parseId(value.createdByMemberId),
    updatedByMemberId: parseId(value.updatedByMemberId),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function parseMember(value: unknown): ExplorationTeamMember {
  if (!isRecord(value) || !exactKeys(value, [
    'id', 'platformMemberId', 'code', 'realName', 'status', 'createdByMemberId', 'createdAt',
  ])) throw new Error('malformed_exploration_team_member')
  const platformMemberId = parseId(value.platformMemberId)
  if (
    value.code !== platformMemberId
    || typeof value.realName !== 'string'
    || !isStatus(value.status)
    || !isUnsignedInteger(value.createdAt)
  ) throw new Error('malformed_exploration_team_member')
  return {
    id: parseId(value.id),
    platformMemberId,
    code: value.code,
    realName: value.realName,
    status: value.status,
    createdByMemberId: parseId(value.createdByMemberId),
    createdAt: value.createdAt,
  }
}

function parseCandidate(value: unknown): ExplorationTeamMemberCandidate {
  if (!isRecord(value) || !exactKeys(value, ['platformMemberId', 'code', 'realName', 'status'])) {
    throw new Error('malformed_exploration_team_candidate')
  }
  const platformMemberId = parseId(value.platformMemberId)
  if (value.code !== platformMemberId || typeof value.realName !== 'string' || value.status !== 'active') {
    throw new Error('malformed_exploration_team_candidate')
  }
  return { platformMemberId, code: value.code, realName: value.realName, status: 'active' }
}

function parseId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > 18_446_744_073_709_551_615n) {
    throw new Error('malformed_exploration_team_id')
  }
  return value
}

function queryString(query: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  return search.toString()
}

function isStatus(value: unknown): value is ExplorationTeamStatus {
  return value === 'active' || value === 'disabled'
}

function isUnsignedInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const keys = [...expected].sort()
  return actual.length === keys.length && actual.every((key, index) => key === keys[index])
}
