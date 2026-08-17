import * as React from 'react'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CircleAlertIcon, CircleCheckIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { AgentAnalysisSummary, type AgentAnalysisSummaryProps } from './agent-analysis-summary'

export interface InspectionRecord {
  date: string
  stationCount: number
  anomalyCount: number
}

const inspectionRecordsByMonth: Record<string, InspectionRecord[]> = {
  '2026-06': [
    { date: '2026-06-03', stationCount: 16, anomalyCount: 0 },
    { date: '2026-06-08', stationCount: 18, anomalyCount: 1 },
    { date: '2026-06-15', stationCount: 21, anomalyCount: 0 },
    { date: '2026-06-22', stationCount: 19, anomalyCount: 2 },
  ],
  '2026-07': [
    { date: '2026-07-01', stationCount: 19, anomalyCount: 0 },
    { date: '2026-07-02', stationCount: 18, anomalyCount: 0 },
    { date: '2026-07-03', stationCount: 20, anomalyCount: 0 },
    { date: '2026-07-04', stationCount: 17, anomalyCount: 0 },
    { date: '2026-07-05', stationCount: 21, anomalyCount: 0 },
    { date: '2026-07-06', stationCount: 18, anomalyCount: 0 },
    { date: '2026-07-07', stationCount: 22, anomalyCount: 0 },
    { date: '2026-07-08', stationCount: 16, anomalyCount: 1 },
    { date: '2026-07-09', stationCount: 20, anomalyCount: 0 },
    { date: '2026-07-10', stationCount: 19, anomalyCount: 0 },
    { date: '2026-07-11', stationCount: 20, anomalyCount: 0 },
    { date: '2026-07-12', stationCount: 21, anomalyCount: 0 },
    { date: '2026-07-13', stationCount: 24, anomalyCount: 2 },
  ],
  '2026-08': [
    { date: '2026-08-04', stationCount: 19, anomalyCount: 0 },
    { date: '2026-08-09', stationCount: 22, anomalyCount: 0 },
    { date: '2026-08-14', stationCount: 20, anomalyCount: 1 },
    { date: '2026-08-21', stationCount: 18, anomalyCount: 0 },
  ],
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六'] as const

function getDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function getMonthKey(date: Date) {
  return getDateKey(date).slice(0, 7)
}

function getMonthWeeks(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const dates: Array<Date | undefined> = Array.from({ length: firstDay.getDay() })

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    dates.push(new Date(month.getFullYear(), month.getMonth(), day))
  }

  while (dates.length % 7 !== 0) {
    dates.push(undefined)
  }

  return Array.from({ length: dates.length / 7 }, (_, index) => dates.slice(index * 7, index * 7 + 7))
}

function formatMonth(month: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(month)
}

export function InspectionCalendar({
  analysis,
  onOpenDailyHistory,
}: {
  analysis: AgentAnalysisSummaryProps
  onOpenDailyHistory: (record: InspectionRecord) => void
}) {
  const [month, setMonth] = React.useState(() => new Date(2026, 6, 1))
  const records = inspectionRecordsByMonth[getMonthKey(month)] ?? []
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const weeks = getMonthWeeks(month)
  const todayKey = getDateKey(new Date())

  function changeMonth(offset: number) {
    setMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
  }

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>巡检日历</CardTitle>
        </div>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} aria-label="上个月">
              <ChevronLeftIcon data-icon="inline-start" />
            </Button>
            <span className="min-w-20 text-center text-sm font-medium tabular-nums">{formatMonth(month)}</span>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} aria-label="下个月">
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[42rem]">
            <div className="grid grid-cols-[7rem_repeat(7,minmax(0,1fr))] gap-1.5">
              <div className="px-2 py-1 text-xs text-muted-foreground">巡检周</div>
              {weekdays.map((weekday) => (
                <div key={weekday} className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
                  周{weekday}
                </div>
              ))}

              {weeks.map((week, weekIndex) => (
                <React.Fragment key={`${getMonthKey(month)}-${weekIndex}`}>
                  <div className="flex flex-col justify-center px-2 text-xs text-muted-foreground">
                    <span>第 {weekIndex + 1} 周</span>
                  </div>
                  {week.map((date, dayIndex) => {
                    const record = date ? recordsByDate.get(getDateKey(date)) : undefined
                    const hasAnomaly = (record?.anomalyCount ?? 0) > 0
                    const dateKey = date ? getDateKey(date) : undefined
                    const isToday = dateKey === todayKey
                    const content = date ? (
                      <>
                        <div className="flex w-full items-center justify-between gap-2">
                          <time className={cn('text-xs font-medium tabular-nums', hasAnomaly && 'text-destructive-foreground')}>
                            {date.getDate()} 日
                          </time>
                          {isToday ? <Badge variant="secondary">今天</Badge> : null}
                        </div>
                        {record ? (
                          <span className={cn('mt-auto flex items-center gap-1 text-xs', hasAnomaly && 'text-destructive-foreground')}>
                            {hasAnomaly ? (
                              <CircleAlertIcon data-icon="inline-start" aria-hidden="true" />
                            ) : (
                              <CircleCheckIcon data-icon="inline-start" aria-hidden="true" />
                            )}
                            {hasAnomaly ? `异常 · ${record.anomalyCount}` : '正常'}
                          </span>
                        ) : null}
                      </>
                    ) : null
                    const cellClassName = cn(
                      'min-h-16 rounded-md p-2',
                      !date && 'bg-muted/40',
                      date && !record && 'bg-muted/40 text-muted-foreground',
                      hasAnomaly && 'bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground',
                    )

                    return (
                      record && dateKey ? (
                        <Button
                          key={dateKey}
                          variant={hasAnomaly ? 'ghost' : 'default'}
                          className={cn('h-auto w-full cursor-pointer flex-col items-start justify-start text-left', cellClassName)}
                          type="button"
                          aria-label={`查看 ${dateKey} 全天巡检记录`}
                          onClick={() => onOpenDailyHistory(record)}
                        >
                          {content}
                        </Button>
                      ) : (
                        <div
                          key={date ? getDateKey(date) : `empty-${weekIndex}-${dayIndex}`}
                          className={cn('flex flex-col', cellClassName)}
                        >
                          {content}
                        </div>
                      )
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <AgentAnalysisSummary {...analysis} />
      </CardContent>
    </Card>
  )
}
