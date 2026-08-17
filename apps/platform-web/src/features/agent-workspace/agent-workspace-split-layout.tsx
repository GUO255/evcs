import { useEffect, useState, type ReactNode } from 'react'
import { useDefaultLayout } from 'react-resizable-panels'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { cn } from '@/lib/utils'

const DESKTOP_LAYOUT_QUERY = '(min-width: 1280px)'
const WORKSPACE_LAYOUT_STORAGE_ID = 'agent-workspace-split-layout'
const WORKSPACE_PANEL_IDS = ['workspace-primary', 'workspace-secondary']

interface AgentWorkspaceSplitLayoutProps {
  primary: ReactNode
  secondary: ReactNode
  fillPrimary?: boolean
}

export function AgentWorkspaceSplitLayout({
  primary,
  secondary,
  fillPrimary = false,
}: AgentWorkspaceSplitLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_LAYOUT_QUERY).matches
  ))

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_LAYOUT_QUERY)
    const updateLayout = () => setIsDesktop(mediaQuery.matches)

    mediaQuery.addEventListener('change', updateLayout)
    updateLayout()

    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  if (!isDesktop) {
    return (
      <div className="grid items-start gap-4">
        <div className="@container/workspace grid min-w-0 gap-4">
          {primary}
        </div>
        <div className="grid min-w-0 gap-4">
          {secondary}
        </div>
      </div>
    )
  }

  return (
    <DesktopAgentWorkspaceSplitLayout
      primary={primary}
      secondary={secondary}
      fillPrimary={fillPrimary}
    />
  )
}

function DesktopAgentWorkspaceSplitLayout({
  primary,
  secondary,
  fillPrimary,
}: AgentWorkspaceSplitLayoutProps) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: WORKSPACE_LAYOUT_STORAGE_ID,
    panelIds: WORKSPACE_PANEL_IDS,
    storage: window.localStorage,
    onlySaveAfterUserInteractions: true,
  })

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="h-[calc(100dvh-5.75rem)] items-stretch 2xl:h-[calc(100dvh-7.375rem)]"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <ResizablePanel
        id="workspace-primary"
        defaultSize="65%"
        minSize="32rem"
        className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
      >
        <div
          className={cn(
            '@container/workspace grid min-w-0 gap-3 pr-0.5 2xl:gap-4 2xl:pr-1',
            fillPrimary && 'h-full',
          )}
        >
          {primary}
        </div>
      </ResizablePanel>
      <ResizableHandle
        withHandle
        autoHide
        className="mx-0.5 self-stretch rounded-full after:w-4 2xl:mx-1"
        aria-label="调整左右内容区域宽度"
      />
      <ResizablePanel id="workspace-secondary" defaultSize="35%" minSize="22rem">
        <div className="grid h-full min-w-0 gap-3 pl-0.5 2xl:gap-4 2xl:pl-1">
          {secondary}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
