import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckIcon } from '@/components/ui/icons'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import type { SiteExplorationRecord } from './site-exploration-api'
import {
  createSiteExplorationCompletion,
  SiteExplorationCompletionBadge,
} from './site-exploration-completion'
import { createConstructionCompletion } from './site-exploration-construction-form'
import { getSiteSelectionRecommendationBand } from './site-selection-recommendation-config'

const siteExplorationStages = [
  { value: 'exploration', label: '勘探' },
  { value: 'analysis', label: '智能体分析' },
  { value: 'contract', label: '签约' },
  { value: 'construction', label: '建设' },
  { value: 'operation', label: '运营' },
] as const

export type SiteExplorationStage = (typeof siteExplorationStages)[number]['value']

export function createSiteExplorationStageState(record: SiteExplorationRecord) {
  const explorationCompletionItems = Object.values(createSiteExplorationCompletion(
    record,
    record.landSceneImages.length,
  ))
  const analysisRecommendation = record.hasAnalysis && record.selectionRecommendation
    ? getSiteSelectionRecommendationBand(record.overallScore)
    : null
  const contractCompletionItems = [Boolean(record.contractDate)]
  const constructionCompletionItems = createConstructionCompletion(record.construction)
  const currentStage = stageFromStatus(record.status)
  const currentStageHighlighted = record.status !== 'draft'

  return {
    currentStage,
    currentStageHighlighted,
    explorationCompletionItems,
    analysisRecommendation,
    contractCompletionItems,
    constructionCompletionItems,
  }
}

function stageFromStatus(status: SiteExplorationRecord['status']): SiteExplorationStage {
  if (status === 'operating') return 'operation'
  if (status === 'under-construction') return 'construction'
  if (status === 'signed') return 'contract'
  if (status === 'completed') return 'analysis'
  return 'exploration'
}

export function SiteExplorationStageBar({
  currentStage,
  currentStageHighlighted,
  explorationCompletionItems,
  analysisRecommendation,
  contractCompletionItems,
  constructionCompletionItems,
}: {
  currentStage: SiteExplorationStage
  currentStageHighlighted: boolean
  explorationCompletionItems: readonly boolean[]
  analysisRecommendation: ReturnType<typeof getSiteSelectionRecommendationBand> | null
  contractCompletionItems: readonly boolean[]
  constructionCompletionItems: readonly boolean[]
}) {
  const currentStageIndex = siteExplorationStages.findIndex((stage) => stage.value === currentStage)

  return (
    <nav aria-label="项目阶段" className="rounded-xl border bg-card px-3 py-4 sm:px-6">
      <TabsList variant="line" className="grid !h-auto w-full grid-cols-5 bg-transparent p-0">
        {siteExplorationStages.map((stage, index) => {
          const reached = index <= currentStageIndex
          const current = index === currentStageIndex
          const completed = index < currentStageIndex
          const highlightedCurrent = current && currentStageHighlighted
          const completionItems = stage.value === 'exploration'
            ? explorationCompletionItems
            : stage.value === 'contract'
                ? contractCompletionItems
                : stage.value === 'construction'
                  ? constructionCompletionItems
                  : []

          return (
            <TabsTrigger
              key={stage.value}
              value={stage.value}
              className="group/stage relative !h-auto min-w-0 flex-col gap-2 rounded-md !bg-transparent py-1 !shadow-none after:hidden focus-visible:ring-2 data-active:text-primary"
            >
              {index > 0 ? (
                <span
                  className={cn(
                    'absolute right-1/2 top-[15px] h-0.5 w-full bg-border',
                    reached && 'bg-primary',
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 flex size-8 items-center justify-center rounded-full border bg-background text-sm font-semibold text-muted-foreground',
                  completed && 'border-primary bg-primary text-primary-foreground',
                  highlightedCurrent && 'border-primary bg-primary text-primary-foreground',
                  'group-data-active/stage:ring-4 group-data-active/stage:ring-primary/15',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {completed ? <CheckIcon className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn(
                'truncate text-sm text-muted-foreground',
                reached && 'font-medium text-foreground',
                highlightedCurrent && 'text-primary',
              )}>
                {stage.label}
              </span>
              {stage.value === 'analysis' ? (
                analysisRecommendation ? (
                  <Badge
                    variant="outline"
                    className={cn('gap-1 pl-1 pr-1.5', analysisRecommendation.badgeClassName)}
                  >
                    <img
                      src="/agent-avatars/robot/evaluation-summary.webp"
                      alt=""
                      className="size-4 rounded-full border bg-muted object-cover"
                      draggable={false}
                    />
                    {analysisRecommendation.label}
                  </Badge>
                ) : (
                  <Badge variant="secondary">待分析</Badge>
                )
              ) : (
                <SiteExplorationCompletionBadge
                  items={completionItems}
                  neutralWhenEmpty={!current}
                  neutralWhenIncomplete
                  optional={stage.value === 'exploration'}
                />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </nav>
  )
}

export function SiteExplorationStagePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        暂无填报项
      </CardContent>
    </Card>
  )
}
