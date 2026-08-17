export interface AgentWorkspaceData {
  name: string
  shortName: string
  avatarSrc: string
  unreadCount: number
}

export const agentWorkspaceByTab = {
  inspection: {
    name: '运维巡检团队',
    shortName: '运维巡检',
    avatarSrc: '/agent-avatars/robot/station-inspection.webp',
    unreadCount: 3,
  },
  'user-operations': {
    name: '用户运营团队',
    shortName: '用户运营',
    avatarSrc: '/agent-avatars/robot/operations-strategy.webp',
    unreadCount: 5,
  },
  'site-selection': {
    name: '智能选址团队',
    shortName: '智能选址',
    avatarSrc: '/agent-avatars/robot/evaluation-summary.webp',
    unreadCount: 2,
  },
  'rate-strategy': {
    name: '费率策略团队',
    shortName: '费率策略',
    avatarSrc: '/agent-avatars/robot/rate-optimization.webp',
    unreadCount: 0,
  },
  'business-analysis': {
    name: '经营分析团队',
    shortName: '经营分析',
    avatarSrc: '/agent-avatars/robot/business-insight.webp',
    unreadCount: 0,
  },
  'campaign-operations': {
    name: '活动运营团队',
    shortName: '活动运营',
    avatarSrc: '/agent-avatars/robot/campaign-planning.webp',
    unreadCount: 0,
  },
} as const satisfies Record<string, AgentWorkspaceData>

export function getAgentWorkspace(tab: string): AgentWorkspaceData {
  const workspace = agentWorkspaceByTab[tab as keyof typeof agentWorkspaceByTab]
  if (!workspace) throw new Error(`Missing agent workspace configuration for tab: ${tab}`)
  return workspace
}
