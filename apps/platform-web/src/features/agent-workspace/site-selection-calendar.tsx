import * as React from 'react'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { AgentAnalysisSummary, type AgentAnalysisSummaryProps } from './agent-analysis-summary'
import {
  siteSelectionRecordsByMonth,
  siteSelectionScoreRanges,
  type SiteSelectionDailyRecord,
} from './site-selection-daily-data'
import { SiteSelectionDailyRecordsDialog } from './site-selection-daily-records-dialog'

const weekdays = ['日', '一', '二', '三', '四', '五', '六'] as const

export function SiteSelectionCalendar({
  analysis,
  records: suppliedRecords,
  selectedDate,
  onDateChange,
}: {
  analysis?: AgentAnalysisSummaryProps
  records?: readonly SiteSelectionDailyRecord[]
  selectedDate?: string
  onDateChange?: (date: string) => void
}) {
  const [dialogDate, setDialogDate] = React.useState<string | null>(null)
  const [month, setMonth] = React.useState(() => {
    const latestDate = suppliedRecords?.at(-1)?.date
    return latestDate ? new Date(`${latestDate}T12:00:00`) : new Date(2026, 6, 1)
  })
  const monthKey = getMonthKey(month)
  const records = suppliedRecords?.filter(({ date }) => date.startsWith(monthKey)) ?? siteSelectionRecordsByMonth[monthKey] ?? []
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const weeks = getMonthWeeks(month)
  const todayKey = getDateKey(new Date())
  const maxRangeCount = Math.max(1, ...records.flatMap((record) => siteSelectionScoreRanges.map((range) => record[range.key])))

  React.useEffect(() => {
    if (!selectedDate) return
    setMonth(new Date(`${selectedDate.slice(0, 7)}-01T12:00:00`))
  }, [selectedDate])

  function changeMonth(offset: number) {
    setMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
  }

  return (
    <>
      <Card className="@container/calendar border bg-muted/20 ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>选址日历</CardTitle>
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
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="选址得分范围图例">
          {siteSelectionScoreRanges.map((range) => (
            <span key={range.key} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-sm', range.tone)} aria-hidden="true" />
              {range.label}
            </span>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1.5 @2xl/calendar:grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
          <div className="px-1 py-1 text-xs text-muted-foreground @2xl/calendar:px-2">选址周</div>
          {weekdays.map((weekday) => (
            <div key={weekday} className="px-1 py-1 text-center text-xs font-medium text-muted-foreground @2xl/calendar:px-2">
              周{weekday}
            </div>
          ))}

          {weeks.map((week, weekIndex) => (
            <React.Fragment key={`${monthKey}-${weekIndex}`}>
              <div className="flex min-w-0 flex-col justify-center px-1 text-xs text-muted-foreground @2xl/calendar:px-2">
                <span>第 {weekIndex + 1} 周</span>
              </div>
              {week.map((date, dayIndex) => {
                const dateKey = date ? getDateKey(date) : undefined
                const record = dateKey ? recordsByDate.get(dateKey) : undefined
                const isToday = dateKey === todayKey
                const isSelected = dateKey === selectedDate

                return (
                  <button
                    type="button"
                    key={dateKey ?? `empty-${weekIndex}-${dayIndex}`}
                    disabled={!date || !record}
                    onClick={() => {
                      if (!dateKey || !record) return
                      onDateChange?.(dateKey)
                      setDialogDate(dateKey)
                    }}
                    className={cn(
                      'flex min-h-24 min-w-0 flex-col gap-2 rounded-md border p-1 text-left @2xl/calendar:min-h-44 @2xl/calendar:p-2',
                      !date && 'border-transparent bg-muted/40',
                      date && !record && 'border-transparent bg-muted/40 text-muted-foreground',
                      date && record && 'cursor-pointer transition-colors hover:border-primary/40 hover:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                      isToday && 'border-primary',
                      isSelected && 'bg-background ring-2 ring-primary/20',
                    )}
                  >
                    {date ? (
                      <>
                        <div className="flex min-w-0 flex-col items-start gap-1 @2xl/calendar:flex-row @2xl/calendar:items-center @2xl/calendar:justify-between @2xl/calendar:gap-2">
                          <time dateTime={dateKey} className="text-xs font-medium tabular-nums">{date.getDate()} 日</time>
                          {isToday ? <Badge variant="secondary">今天</Badge> : null}
                        </div>
                        {record ? (
                          <>
                            <p className="text-xs font-medium tabular-nums">勘探 {record.explorationCount} 个</p>
                            <div className="hidden flex-col gap-1.5 @2xl/calendar:flex" role="img" aria-label={`${dateKey} 各得分范围站点数量横向柱状图`}>
                              {siteSelectionScoreRanges.map((range) => {
                                const count = record[range.key]
                                return (
                                  <div key={range.key} className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">{range.shortLabel}</span>
                                    <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                      <span className={cn('block h-full rounded-full', range.tone)} style={{ width: `${count / maxRangeCount * 100}%` }} />
                                    </span>
                                    <span className="text-right text-[10px] tabular-nums text-muted-foreground">{count}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </div>
        {analysis ? <AgentAnalysisSummary {...analysis} /> : null}
      </CardContent>
      </Card>
      <SiteSelectionDailyRecordsDialog
        date={dialogDate}
        open={dialogDate !== null}
        onClose={() => setDialogDate(null)}
      />
    </>
  )
}

function getDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function getMonthKey(date: Date): string {
  return getDateKey(date).slice(0, 7)
}

function getMonthWeeks(month: Date): Array<Array<Date | undefined>> {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const dates: Array<Date | undefined> = Array.from({ length: firstDay.getDay() })

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    dates.push(new Date(month.getFullYear(), month.getMonth(), day))
  }

  while (dates.length % 7 !== 0) dates.push(undefined)

  return Array.from({ length: dates.length / 7 }, (_, index) => dates.slice(index * 7, index * 7 + 7))
}

function formatMonth(month: Date): string {
  return `${month.getFullYear()}年${month.getMonth() + 1}月`
}

export function getSiteSelectionCalendarData() {
  return { scoreRanges: siteSelectionScoreRanges, recordsByMonth: siteSelectionRecordsByMonth }
}
