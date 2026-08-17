import { Fragment, type ReactNode } from 'react'
import {
  ClipboardListIcon,
  HistoryIcon,
  MessagesIcon,
  UsersRoundIcon,
} from '@/components/ui/icons'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import {
  AgentConversation,
  type AgentConversationProps,
} from './agent-conversation-dialog'

type AgentTeamMember = {
  id: string
  name: string
  avatarSrc: string
  fallback: string
  responsibility: string
  emphasis?: boolean
  status?: string
}

type AgentTeamCardProps = {
  agents: readonly AgentTeamMember[]
  conversation: AgentConversationProps
  workRecords: ReactNode
  agentLogs: ReactNode
  unreadWorkRecordCount: number
}

export function AgentTeamCard({
  agents,
  conversation,
  workRecords,
  agentLogs,
  unreadWorkRecordCount,
}: AgentTeamCardProps) {
  return (
    <Card className="h-[calc(100vh-8rem)] min-h-[42rem] max-h-[58rem] border ring-0 xl:h-full xl:min-h-0 xl:max-h-none xl:[--card-spacing:--spacing(3)] 2xl:[--card-spacing:--spacing(4)]">
      <Tabs defaultValue="conversation" className="min-h-0 flex-1 gap-3 2xl:gap-4">
        <CardHeader>
          <TabsList
            className="grid w-full grid-cols-4"
            aria-label="智能体卡片内容"
          >
            <TabsTrigger value="conversation">
              <MessagesIcon data-icon="inline-start" aria-hidden="true" />
              智能体
            </TabsTrigger>
            <TabsTrigger value="team">
              <UsersRoundIcon data-icon="inline-start" aria-hidden="true" />
              团队
            </TabsTrigger>
            <TabsTrigger value="work-records">
              <ClipboardListIcon data-icon="inline-start" aria-hidden="true" />
              工作记录
              {unreadWorkRecordCount > 0 ? (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 bg-destructive px-1.5 text-xs text-destructive-foreground tabular-nums dark:bg-destructive"
                  aria-label={`${unreadWorkRecordCount} 条未读工作记录`}
                >
                  {unreadWorkRecordCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="agent-logs">
              <HistoryIcon data-icon="inline-start" aria-hidden="true" />
              日志
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 pt-0">
          <TabsContent value="conversation" className="h-full">
            <AgentConversation {...conversation} className="h-full" />
          </TabsContent>
          <TabsContent value="team" className="h-full">
            <ScrollArea className="h-full pr-5">
              <div className="flex flex-col">
                {agents.map((agent, index) => (
                  <Fragment key={agent.id}>
                    <div className={cn('flex items-start gap-3', agent.emphasis && 'rounded-lg bg-primary/5 p-3')}>
                      <Avatar size="lg" className="border bg-background shadow-xs">
                        <AvatarImage src={agent.avatarSrc} alt={agent.name} />
                        <AvatarFallback>{agent.fallback}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{agent.name}</p>
                          {agent.status ? <Badge variant="outline">{agent.status}</Badge> : null}
                        </div>
                        <p className="mt-1 leading-5 text-muted-foreground">职责：{agent.responsibility}</p>
                      </div>
                    </div>
                    {index < agents.length - 1 ? <Separator className="my-3" /> : null}
                  </Fragment>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="work-records" className="h-full">
            <ScrollArea className="h-full pr-5">
              <EmbeddedTabContent>{workRecords}</EmbeddedTabContent>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="agent-logs" className="h-full">
            <ScrollArea className="h-full pr-5">
              <EmbeddedTabContent>{agentLogs}</EmbeddedTabContent>
            </ScrollArea>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

function EmbeddedTabContent({ children }: { children: ReactNode }) {
  return (
    <div className="[&>[data-slot=card]]:gap-4 [&>[data-slot=card]]:overflow-visible [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:border-0 [&>[data-slot=card]]:bg-transparent [&>[data-slot=card]]:py-0 [&>[data-slot=card]]:ring-0 [&>[data-slot=card]>[data-slot=card-content]]:px-0 [&>[data-slot=card]>[data-slot=card-header]]:px-0">
      {children}
    </div>
  )
}
