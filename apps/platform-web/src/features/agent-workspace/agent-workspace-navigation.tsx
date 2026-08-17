import { Link } from '@tanstack/react-router'

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { agentWorkspaceByTab } from '@/features/agent-workspace/agent-workspace-data'
import type {
  AgentWorkspaceTab,
  AgentWorkspaceView,
} from '@/features/agent-workspace/agent-workspace-permissions'
import { cn } from '@/lib/utils'

interface AgentWorkspaceNavigationGroupsProps {
  activeTab: AgentWorkspaceView
  permittedTabs: readonly AgentWorkspaceTab[]
  onNavigate?: () => void
}

const agentWorldAvatarTabs = [
  'inspection',
  'user-operations',
  'site-selection',
] as const satisfies readonly AgentWorkspaceTab[]

export function AgentWorkspaceNavigationGroups({
  activeTab,
  permittedTabs,
  onNavigate,
}: AgentWorkspaceNavigationGroupsProps) {
  return (
    <div>
      <Link
        to="/agents"
        search={{ tab: 'agent-world' }}
        aria-label="智能体世界"
        className={cn(
          buttonVariants({ variant: activeTab === 'agent-world' ? 'secondary' : 'ghost' }),
          'h-10 min-w-0 w-full justify-start gap-2 overflow-hidden px-2 @max-[160px]/sidebar:h-auto @max-[160px]/sidebar:flex-col @max-[160px]/sidebar:items-center @max-[160px]/sidebar:justify-center @max-[160px]/sidebar:gap-1 @max-[160px]/sidebar:px-0 @max-[160px]/sidebar:py-2 @xs/sidebar:gap-3 @xs/sidebar:px-3',
        )}
        onClick={onNavigate}
      >
        <AgentWorldAvatarGroup />
        <AgentWorldAvatarGroup compact />
        <span className="min-w-0 truncate @max-[160px]/sidebar:hidden">
          智能体世界
        </span>
        <span className="hidden max-w-full truncate text-center text-[11px] leading-4 @max-[160px]/sidebar:block">
          智能体世界
        </span>
      </Link>
      <section className="mt-4 flex flex-col gap-2 @max-[160px]/sidebar:mt-2">
        <h2 className="px-2 text-xs font-medium text-muted-foreground @max-[160px]/sidebar:hidden">
          智能体团队
        </h2>
        <div className="flex flex-col gap-1">
          {permittedTabs.map((id) => {
            const item = agentWorkspaceByTab[id]
            const active = id === activeTab

            return (
              <Link
                key={id}
                to="/agents"
                search={{ tab: id }}
                aria-label={item.name}
                className={cn(
                  buttonVariants({ variant: active ? 'secondary' : 'ghost' }),
                  'h-auto min-w-0 w-full justify-start gap-2 overflow-hidden px-2 py-2 text-left @max-[160px]/sidebar:flex-col @max-[160px]/sidebar:justify-center @max-[160px]/sidebar:gap-1 @max-[160px]/sidebar:px-0 @max-[160px]/sidebar:text-center @xs/sidebar:gap-3 @xs/sidebar:px-3',
                )}
                onClick={onNavigate}
              >
                <img
                  src={item.avatarSrc}
                  alt=""
                  className="size-8 shrink-0 rounded-full bg-muted object-cover"
                />
                <span className="min-w-0 flex-1 truncate @max-[160px]/sidebar:hidden">
                  {item.name}
                </span>
                <span className="hidden max-w-full truncate text-center text-[11px] leading-4 @max-[160px]/sidebar:block">
                  {item.shortName}
                </span>
                {item.unreadCount > 0 ? (
                  <Badge
                    className="ml-auto min-w-5 px-1.5 tabular-nums @max-[160px]/sidebar:hidden"
                    variant="destructive"
                    aria-label={`${item.unreadCount} 条未读消息`}
                  >
                    {item.unreadCount}
                  </Badge>
                ) : null}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function AgentWorldAvatarGroup({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <AvatarGroup
      className={compact
        ? 'hidden shrink-0 @max-[160px]/sidebar:flex'
        : 'shrink-0 @max-[160px]/sidebar:hidden'}
    >
      {agentWorldAvatarTabs.map((id, index) => {
        const agent = agentWorkspaceByTab[id]

        return (
          <Avatar
            key={id}
            size="sm"
            className={compact && index > 0 ? '@max-[80px]/sidebar:hidden' : undefined}
          >
            <AvatarImage src={agent.avatarSrc} alt="" />
            <AvatarFallback>{agent.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
        )
      })}
    </AvatarGroup>
  )
}
