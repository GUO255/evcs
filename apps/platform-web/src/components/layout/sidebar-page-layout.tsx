import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

const COLLAPSIBLE_LAYOUT_QUERY = '(min-width: 768px)'
const SIDEBAR_EXPANDED_SIZE = '17.125rem'

interface SidebarPageLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  contentLabel?: string
  containDesktopScroll?: boolean
  collapsibleLayoutId?: string
  flushContent?: boolean
}

export function SidebarPageLayout({
  sidebar,
  children,
  contentLabel,
  containDesktopScroll = false,
  collapsibleLayoutId,
  flushContent = false,
}: SidebarPageLayoutProps) {
  if (collapsibleLayoutId) {
    return (
      <ResponsiveSidebarPageLayout
        sidebar={sidebar}
        contentLabel={contentLabel}
        containDesktopScroll={containDesktopScroll}
        collapsibleLayoutId={collapsibleLayoutId}
        flushContent={flushContent}
      >
        {children}
      </ResponsiveSidebarPageLayout>
    )
  }

  return (
    <StaticSidebarPageLayout
      sidebar={sidebar}
      contentLabel={contentLabel}
      containDesktopScroll={containDesktopScroll}
      flushContent={flushContent}
    >
      {children}
    </StaticSidebarPageLayout>
  )
}

function StaticSidebarPageLayout({
  sidebar,
  children,
  contentLabel,
  containDesktopScroll = false,
  flushContent = false,
}: Omit<SidebarPageLayoutProps, 'collapsibleLayoutId'>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[17.125rem_minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)] 2xl:grid-cols-[17.125rem_minmax(0,1fr)]">
      {sidebar}
      <SidebarPageContent
        contentLabel={contentLabel}
        containDesktopScroll={containDesktopScroll}
        flushContent={flushContent}
      >
        {children}
      </SidebarPageContent>
    </div>
  )
}

function ResponsiveSidebarPageLayout({
  sidebar,
  children,
  contentLabel,
  containDesktopScroll = false,
  collapsibleLayoutId,
  flushContent = false,
}: SidebarPageLayoutProps & { collapsibleLayoutId: string }) {
  const [isCollapsible, setIsCollapsible] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(COLLAPSIBLE_LAYOUT_QUERY).matches
  ))

  useEffect(() => {
    const mediaQuery = window.matchMedia(COLLAPSIBLE_LAYOUT_QUERY)
    const updateLayout = () => setIsCollapsible(mediaQuery.matches)

    mediaQuery.addEventListener('change', updateLayout)
    updateLayout()

    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])

  if (!isCollapsible) {
    return (
      <StaticSidebarPageLayout
        sidebar={sidebar}
        contentLabel={contentLabel}
        containDesktopScroll={containDesktopScroll}
        flushContent={flushContent}
      >
        {children}
      </StaticSidebarPageLayout>
    )
  }

  return (
    <DesktopCollapsibleSidebarPageLayout
      sidebar={sidebar}
      contentLabel={contentLabel}
      containDesktopScroll={containDesktopScroll}
      flushContent={flushContent}
      collapsibleLayoutId={collapsibleLayoutId}
    >
      {children}
    </DesktopCollapsibleSidebarPageLayout>
  )
}

function DesktopCollapsibleSidebarPageLayout({
  sidebar,
  children,
  contentLabel,
  containDesktopScroll = false,
  collapsibleLayoutId,
  flushContent = false,
}: SidebarPageLayoutProps & { collapsibleLayoutId: string }) {
  const storageKey = `${collapsibleLayoutId}:expanded`
  const [expanded, setExpanded] = useState(() => (
    window.localStorage.getItem(storageKey) === 'true'
  ))

  function toggleSidebar() {
    setExpanded((current) => {
      const next = !current
      window.localStorage.setItem(storageKey, String(next))
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 items-stretch">
      <div
        className={cn(
          '@container/sidebar relative h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-linear',
          expanded
            ? 'w-[17.125rem] xl:w-[13.5rem] 2xl:w-[17.125rem]'
            : 'w-[88px]',
        )}
      >
        {sidebar}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
          aria-label={expanded ? '收起侧边栏' : '展开侧边栏'}
          title={expanded ? '收起侧边栏' : '展开侧边栏'}
          aria-expanded={expanded}
          onClick={toggleSidebar}
        >
          {expanded
            ? <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
            : <ChevronRightIcon data-icon="inline-start" aria-hidden="true" />}
        </Button>
      </div>
      <SidebarPageContent
        contentLabel={contentLabel}
        containDesktopScroll={containDesktopScroll}
        flushContent={flushContent}
      >
        {children}
      </SidebarPageContent>
    </div>
  )
}

function SidebarPageContent({
  children,
  contentLabel,
  containDesktopScroll,
  flushContent,
}: Pick<SidebarPageLayoutProps, 'children' | 'contentLabel' | 'containDesktopScroll' | 'flushContent'>) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [showScrollToTop, setShowScrollToTop] = useState(false)

  return (
    <main
      className="min-h-0 min-w-0 flex-1 overflow-hidden pb-0 pl-0 pr-0 pt-0 md:h-full md:pb-4 md:pr-3 lg:pr-4 xl:pb-3 xl:pr-3 2xl:pb-4 2xl:pr-4"
    >
      <div
        className="relative h-full min-h-0 overflow-hidden rounded-xl bg-[#F5F5F5]"
        aria-label={contentLabel}
      >
        <div
          ref={scrollContainerRef}
          className={cn(
            'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border h-full min-h-0 overflow-y-auto',
            flushContent ? 'p-0' : 'p-3 md:p-4 xl:p-3 2xl:p-4',
            containDesktopScroll && 'xl:overflow-hidden',
          )}
          onScroll={(event) => setShowScrollToTop(event.currentTarget.scrollTop > 0)}
        >
          {children}
        </div>
        {showScrollToTop ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute bottom-3 right-3 z-10 rounded-full shadow-md md:bottom-4 md:right-4"
            aria-label="回到顶部"
            title="回到顶部"
            onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUpIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </main>
  )
}
