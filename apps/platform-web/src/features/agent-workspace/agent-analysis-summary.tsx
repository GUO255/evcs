import { useEffect, useRef, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

type AnalysisAgent = {
  name: string
  avatarSrc: string
  fallback: string
}

export type AgentAnalysisSummaryProps = {
  agent: AnalysisAgent
  title: string
  content: string
}

export function AgentAnalysisSummary({ agent, title, content }: AgentAnalysisSummaryProps) {
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [contentOverflowing, setContentOverflowing] = useState(false)

  useEffect(() => {
    const contentElement = contentRef.current

    if (!contentElement) return

    const measureOverflow = () => {
      setContentOverflowing(contentElement.scrollHeight > contentElement.clientHeight + 1)
    }

    measureOverflow()

    const resizeObserver = new ResizeObserver(measureOverflow)
    resizeObserver.observe(contentElement)

    return () => resizeObserver.disconnect()
  }, [content])

  return (
    <>
      <div className="mt-auto">
        <Separator className="my-3" />
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarImage src={agent.avatarSrc} alt={agent.name} />
            <AvatarFallback>{agent.fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{agent.name}分析</p>
            <p ref={contentRef} className="mt-1 line-clamp-2 text-sm leading-5">
              {content}
            </p>
            {contentOverflowing ? (
              <Button variant="link" size="xs" type="button" onClick={() => setDialogOpen(true)}>
                查看全部
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{agent.name}基于当前图表数据生成</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
            <Avatar>
              <AvatarImage src={agent.avatarSrc} alt={agent.name} />
              <AvatarFallback>{agent.fallback}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 flex-1 text-sm leading-7">{content}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
