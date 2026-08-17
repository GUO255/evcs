import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ChevronRightIcon, ClipboardListIcon, MapPinnedIcon } from '@/components/ui/icons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  SiteExplorationFilterQuery,
  SiteExplorationMapPointFeature,
} from '@/features/site-planning/site-exploration-api'
import type { SiteExplorationFilterOptions } from '@/features/site-planning/site-exploration-data'
import type { SiteInventoryMapFeature } from '@/features/site-planning/site-inventory-api'

import { SiteSelectionMapExplorationList } from './site-selection-map-exploration-list'
import { SiteSelectionMapTaskList } from './site-selection-map-task-list'
import type {
  TaskSiteFilterOptions,
  TaskSiteFilters,
} from './site-selection-map-task-filters'

type StationListTab = 'exploration' | 'tasks'

type SiteSelectionMapStationPanelProps = {
  scopeTeamName: string | null
  explorationSites: readonly SiteExplorationMapPointFeature[]
  selectedExplorationSiteId: string | null
  explorationPending: boolean
  explorationError: unknown | null
  onRetryExploration: () => void
  onSelectExploration: (site: SiteExplorationMapPointFeature) => void
  explorationFilters: SiteExplorationFilterQuery
  explorationFilterOptions: SiteExplorationFilterOptions | null
  explorationFilterOptionsPending: boolean
  explorationFilterOptionsError: unknown | null
  onExplorationFiltersChange: (filters: SiteExplorationFilterQuery) => void
  onRetryExplorationFilterOptions: () => void
  taskSites: readonly SiteInventoryMapFeature[]
  taskFilters: TaskSiteFilters
  taskFilterOptions: TaskSiteFilterOptions
  onTaskFiltersChange: (filters: TaskSiteFilters) => void
  selectedTaskSiteId: string | null
  tasksPending: boolean
  tasksError: unknown | null
  onRetryTasks: () => void
  onSelectTask: (site: SiteInventoryMapFeature) => void
  onCollapse: () => void
}

export function SiteSelectionMapStationPanel({
  scopeTeamName,
  explorationSites,
  selectedExplorationSiteId,
  explorationPending,
  explorationError,
  onRetryExploration,
  onSelectExploration,
  explorationFilters,
  explorationFilterOptions,
  explorationFilterOptionsPending,
  explorationFilterOptionsError,
  onExplorationFiltersChange,
  onRetryExplorationFilterOptions,
  taskSites,
  taskFilters,
  taskFilterOptions,
  onTaskFiltersChange,
  selectedTaskSiteId,
  tasksPending,
  tasksError,
  onRetryTasks,
  onSelectTask,
  onCollapse,
}: SiteSelectionMapStationPanelProps) {
  const [activeTab, setActiveTab] = useState<StationListTab>('exploration')
  const title = scopeTeamName ? `站点（${scopeTeamName}）` : '站点'

  return (
    <aside
      className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-r-lg border bg-card/95 backdrop-blur"
      aria-label="站点列表"
    >
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full shrink-0 justify-between rounded-none rounded-tr-lg border-b px-3 py-2.5 text-left hover:bg-muted/50"
        aria-label="收起为 Mini 站点列表"
        title="收起"
        onClick={onCollapse}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MapPinnedIcon className="size-4 shrink-0" aria-hidden="true" />
          <p className="truncate font-medium" title={title}>{title}</p>
        </div>
        <ChevronRightIcon className="shrink-0 rotate-180" aria-hidden="true" />
      </Button>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value !== 'exploration' && value !== 'tasks') {
            throw new Error(`Unknown station list tab: ${value}`)
          }
          setActiveTab(value)
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          variant="line"
          className="grid !h-10 w-full shrink-0 grid-cols-2 border-b px-2 py-1"
          aria-label="站点类型"
        >
          <TabsTrigger value="exploration">
            <MapPinnedIcon aria-hidden="true" />
            勘探站点（{explorationSites.length}）
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardListIcon aria-hidden="true" />
            任务站点（{taskSites.length}）
          </TabsTrigger>
        </TabsList>
        <TabsContent value="exploration" keepMounted className="min-h-0 overflow-hidden">
          <SiteSelectionMapExplorationList
            sites={explorationSites}
            selectedSiteId={selectedExplorationSiteId}
            isPending={explorationPending}
            error={explorationError}
            onRetry={onRetryExploration}
            onSelect={onSelectExploration}
            filters={explorationFilters}
            filterOptions={explorationFilterOptions}
            filterOptionsPending={explorationFilterOptionsPending}
            filterOptionsError={explorationFilterOptionsError}
            onFiltersChange={onExplorationFiltersChange}
            onRetryFilterOptions={onRetryExplorationFilterOptions}
          />
        </TabsContent>
        <TabsContent value="tasks" keepMounted className="min-h-0 overflow-hidden">
          <SiteSelectionMapTaskList
            sites={taskSites}
            filters={taskFilters}
            filterOptions={taskFilterOptions}
            onFiltersChange={onTaskFiltersChange}
            selectedSiteId={selectedTaskSiteId}
            isPending={tasksPending}
            error={tasksError}
            onRetry={onRetryTasks}
            onSelect={onSelectTask}
          />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
