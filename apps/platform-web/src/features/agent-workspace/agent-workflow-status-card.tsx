import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/ui/icons'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { AgentWorkflowStep, StreamingAgentReply } from './agent-workflow-step'

export interface AgentWorkflowStatusStep {
  order: number
  title: string
  description: string
  progress: number
  reply: string
}

interface AgentWorkflowStatusCardProps {
  agentName: string
  agentAvatarSrc: string
  agentFallback: string
  summary: string
  steps: readonly AgentWorkflowStatusStep[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function AgentWorkflowStatusCard({
  agentName,
  agentAvatarSrc,
  agentFallback,
  summary,
  steps,
  collapsible = false,
  defaultExpanded = false,
}: AgentWorkflowStatusCardProps) {
  const activeStep = requireActiveWorkflowStep(steps)
  const [selectedStepOrder, setSelectedStepOrder] = useState(activeStep.order)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const selectedStep = steps.find((step) => step.order === selectedStepOrder)
  const showDetails = !collapsible || expanded

  if (!selectedStep) throw new Error(`Unknown workflow step order: ${selectedStepOrder}`)

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg">
            <AvatarImage src={agentAvatarSrc} alt={agentName} />
            <AvatarFallback>{agentFallback}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{agentName}</CardTitle>
              <Badge variant="destructive">
                <span
                  className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none"
                  aria-hidden="true"
                />
                实时
              </Badge>
            </div>
            <CardDescription>{summary}</CardDescription>
          </div>
        </div>
        {collapsible ? (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-expanded={expanded}
              aria-label={expanded ? '折叠智能选址工作流' : '展开智能选址工作流'}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded
                ? <ChevronUpIcon aria-hidden="true" />
                : <ChevronDownIcon aria-hidden="true" />}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      {showDetails ? (
        <CardContent className="pt-4">
          <ol className="flex flex-col gap-4 md:flex-row md:items-center md:gap-0">
            {steps.map((step, index) => (
              <AgentWorkflowStep
                key={step.order}
                order={step.order}
                title={step.title}
                description={step.description}
                progress={step.progress}
                connect={index < steps.length - 1}
                selected={step.order === selectedStepOrder}
                onSelect={() => setSelectedStepOrder(step.order)}
              />
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-3 pt-4">
            <Avatar size="sm">
              <AvatarImage src={agentAvatarSrc} alt={agentName} />
              <AvatarFallback>{agentFallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 rounded-lg bg-muted px-4 py-3">
              <StreamingAgentReply text={selectedStep.reply} active />
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

function requireActiveWorkflowStep(steps: readonly AgentWorkflowStatusStep[]) {
  const activeStep = steps.find((step) => step.progress > 0 && step.progress < 100)

  if (!activeStep) throw new Error('Workflow status card requires one active step')

  return activeStep
}
