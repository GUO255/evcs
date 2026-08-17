import { useEffect, useState } from 'react'

import { SidebarPageLayout } from '@/components/layout/sidebar-page-layout'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  agentWorkspaceByTab,
  getAgentWorkspace,
} from '@/features/agent-workspace/agent-workspace-data'
import type {
  AgentWorkspaceTab,
  AgentWorkspaceView,
} from '@/features/agent-workspace/agent-workspace-permissions'
import {
  agentTeamByWorkspace,
  getAgentActivitySummary,
} from '@/features/agent-workspace/agent-team-data'
import { rememberAgentWorkspaceTab } from '@/features/product-shell/navigation-memory'

import { AgentConversationDialog } from './agent-conversation-dialog'
import { AgentWorkspaceNavigationGroups } from './agent-workspace-navigation'
import { InspectionAgentDashboard } from './inspection-agent-dashboard'
import { SiteSelectionAgentDashboard } from './site-selection-agent-dashboard'
import { UserOperationsAgentDashboard } from './user-operations-agent-dashboard'

interface AgentWorkspacePageProps {
  tab: AgentWorkspaceView
  permittedTabs: readonly AgentWorkspaceTab[]
}

export function AgentWorkspacePage({ tab, permittedTabs }: AgentWorkspacePageProps) {
  const workspace = tab === 'agent-world' ? null : getAgentWorkspace(tab)
  const currentAreaName = workspace?.name ?? '智能体世界'
  const [digitalTwinOpen, setDigitalTwinOpen] = useState(false)

  useEffect(() => {
    rememberAgentWorkspaceTab(window.sessionStorage, tab)
  }, [tab])

  return (
    <SidebarPageLayout
      contentLabel={`${currentAreaName}内容区域`}
      containDesktopScroll={tab !== 'agent-world'}
      collapsibleLayoutId="agent-workspace-sidebar-layout"
      sidebar={(
        <aside className="@container/sidebar hidden min-h-0 min-w-0 flex-col px-2 pb-16 pt-4 md:flex md:h-full @max-[160px]/sidebar:px-1 @xs/sidebar:pl-4 @xs/sidebar:pr-3 @xs/sidebar:pb-16 @xs/sidebar:pt-6">
          <nav
            className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border min-h-0 flex-1 overflow-y-auto"
            aria-label="智能体团队"
          >
            <AgentWorkspaceNavigationGroups
              activeTab={tab}
              permittedTabs={permittedTabs}
            />
          </nav>
          <div className="flex shrink-0 flex-col gap-3 pt-4">
            <Separator />
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full flex-col gap-2 py-3 @max-[160px]/sidebar:gap-1 @max-[160px]/sidebar:py-2"
              aria-label="打开我的数字分身对话"
              onClick={() => setDigitalTwinOpen(true)}
            >
              <Avatar className="size-12 border bg-background shadow-sm @xs/sidebar:size-16">
                <AvatarImage
                  src="/agent-avatars/robot/personal-digital-twin.webp"
                  alt="我的数字分身"
                />
                <AvatarFallback>我</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 max-w-full items-center gap-2 @max-[160px]/sidebar:hidden">
                <span className="truncate">我的数字分身</span>
                <Badge variant="secondary">在线</Badge>
              </span>
              <span className="hidden max-w-full truncate text-center text-[11px] leading-4 @max-[160px]/sidebar:block">
                数字分身
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground @max-[160px]/sidebar:hidden">
                点击开始对话
              </span>
            </Button>
          </div>
        </aside>
      )}
    >
      {tab === 'agent-world' ? <AgentWorldContent agentTabs={permittedTabs} /> : null}
      {tab === 'inspection' ? <InspectionAgentDashboard /> : null}
      {tab === 'user-operations' ? <UserOperationsAgentDashboard /> : null}
      {tab === 'site-selection' ? <SiteSelectionAgentDashboard /> : null}
      {digitalTwinOpen ? (
        <AgentConversationDialog
          agentName="我的数字分身"
          agentAvatarSrc="/agent-avatars/robot/personal-digital-twin.webp"
          agentFallback="我"
          description={`我的数字分身正在协助你使用${currentAreaName}。`}
          initialMessage={`你好，我是你的数字分身。当前正在${currentAreaName}，你可以直接告诉我想查看的数据、任务或分析结论。`}
          reply={`已收到。我会结合${currentAreaName}当前的数据和工作记录，为你整理相关信息并给出下一步建议。`}
          placeholder={`向我的数字分身询问${currentAreaName}`}
          onClose={() => setDigitalTwinOpen(false)}
        />
      ) : null}
    </SidebarPageLayout>
  )
}

function AgentWorldContent({ agentTabs }: { agentTabs: readonly AgentWorkspaceTab[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full border ring-0">
        <CardContent>
          <div className="relative aspect-[1774/887] w-full overflow-hidden rounded-lg bg-slate-900">
            <img
              alt="展示六支智能体团队协作空间和新能源重卡场景的智能体世界"
              className="size-full object-contain"
              decoding="async"
              draggable={false}
              src="/agent-world/agent-world-final.webp"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {agentTabs.map((id) => {
          const workspace = agentWorkspaceByTab[id]
          const team = agentTeamByWorkspace[id]
          const headingId = `agent-world-${id}-heading`

          return (
            <section key={id} className="flex flex-col gap-3" aria-labelledby={headingId}>
              <h2 id={headingId} className="text-base font-medium">{workspace.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {team.map((member) => {
                  const activity = getAgentActivitySummary(member.id)

                  return (
                    <Card key={member.id} size="sm" className="h-full border ring-0">
                      <CardHeader className="flex flex-row items-center gap-3">
                        <Avatar size="lg">
                          <AvatarImage src={member.avatarSrc} alt={member.name} />
                          <AvatarFallback>{member.fallback}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="min-w-0 truncate">{member.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 pt-0">
                        <p className="line-clamp-3 leading-5 text-muted-foreground">
                          {member.responsibility}
                        </p>
                      </CardContent>
                      <CardFooter className="grid grid-cols-3 gap-2">
                        <AgentActivityMetric
                          label="运行次数"
                          value={`${activity.runCount} 次`}
                        />
                        <AgentActivityMetric
                          label="工作记录"
                          value={`${activity.workRecordCount} 次`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">当前状态</p>
                          <Badge
                            className="mt-1"
                            variant={activity.status === '运行中' ? 'destructive' : 'secondary'}
                          >
                            {activity.status}
                          </Badge>
                        </div>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function AgentActivityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}
