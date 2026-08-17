import { useEffect, useState } from 'react'
import { CircleCheckIcon, LoaderCircleIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AgentWorkflowStepProps {
  order: number
  title: string
  description: string
  progress: number
  connect: boolean
  selected: boolean
  onSelect: () => void
}

export function AgentWorkflowStep({
  order,
  title,
  description,
  progress,
  connect,
  selected,
  onSelect,
}: AgentWorkflowStepProps) {
  const completed = progress === 100
  const running = progress > 0 && !completed
  const stepContent = (
    <>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
        data-active={progress > 0}
      >
        {order}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span
          className="flex items-center gap-1 text-xs font-normal text-muted-foreground data-[active=true]:text-primary"
          data-active={progress > 0}
        >
          {completed ? <CircleCheckIcon aria-hidden="true" /> : null}
          {running ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : null}
          {description}
        </span>
      </span>
    </>
  )

  return (
    <li
      className={cn(
        'flex w-full min-w-0 items-center gap-3 md:w-auto',
        connect ? 'md:flex-1' : 'md:shrink-0',
      )}
    >
      <Button
        variant="ghost"
        className={cn(
          'h-auto min-w-0 justify-start gap-3 px-3 py-2 text-left',
          selected && 'bg-muted',
        )}
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
      >
        {stepContent}
      </Button>
      {connect ? <span className="hidden h-px min-w-4 flex-1 bg-border md:block" aria-hidden="true" /> : null}
    </li>
  )
}

export function StreamingAgentReply({ text, active }: { text: string; active: boolean }) {
  const [visibleText, setVisibleText] = useState('')

  useEffect(() => {
    if (!active) {
      setVisibleText('')
      return
    }

    let length = 0
    setVisibleText('')
    const timer = window.setInterval(() => {
      length += 1
      setVisibleText(text.slice(0, length))
      if (length >= text.length) {
        window.clearInterval(timer)
      }
    }, 24)

    return () => window.clearInterval(timer)
  }, [active, text])

  return (
    <p className="text-sm leading-6">
      {visibleText}
      {active && visibleText.length < text.length ? (
        <span className="ml-0.5 inline-block animate-pulse text-primary" aria-hidden="true">▋</span>
      ) : null}
    </p>
  )
}
