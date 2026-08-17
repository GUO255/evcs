import { useMemo, useState } from 'react'
import { zhCN } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function SiteSelectionDateFilter({
  availableDates,
  selectedDate,
  onDateChange,
  label,
  showAll = true,
}: {
  availableDates: readonly string[]
  selectedDate: string | null
  onDateChange: (date: string | null) => void
  label: string
  showAll?: boolean
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const sortedDates = useMemo(() => [...new Set(availableDates)].sort(), [availableDates])
  const availableDateSet = useMemo(() => new Set(sortedDates), [sortedDates])
  const selectedDateIndex = selectedDate ? sortedDates.indexOf(selectedDate) : -1
  const previousDate = selectedDateIndex > 0 ? sortedDates[selectedDateIndex - 1] : undefined
  const nextDate = selectedDateIndex >= 0 ? sortedDates[selectedDateIndex + 1] : undefined
  const selectedCalendarDate = selectedDate ? parseDateValue(selectedDate) : undefined
  const latestDate = sortedDates.at(-1)

  return (
    <div className="flex items-center gap-1" role="group" aria-label={`${label}日期过滤`}>
      {showAll ? (
        <Button
          variant={selectedDate === null ? 'secondary' : 'ghost'}
          size="sm"
          type="button"
          aria-pressed={selectedDate === null}
          onClick={() => onDateChange(null)}
        >
          全部
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={`查看上一天${label}`}
        disabled={!previousDate}
        onClick={() => {
          if (previousDate) onDateChange(previousDate)
        }}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="sm" className="min-w-28 text-sm" type="button" />}>
          {selectedDate ? formatDateLabel(selectedDate) : '选择日期'}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={zhCN}
            selected={selectedCalendarDate}
            defaultMonth={selectedCalendarDate ?? (latestDate ? parseDateValue(latestDate) : undefined)}
            disabled={(date) => !availableDateSet.has(formatDateValue(date))}
            onSelect={(date) => {
              if (!date) return
              onDateChange(formatDateValue(date))
              setCalendarOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={`查看下一天${label}`}
        disabled={!nextDate}
        onClick={() => {
          if (nextDate) onDateChange(nextDate)
        }}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

function parseDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Invalid site selection date: ${value}`)
  return new Date(year, month - 1, day)
}

function formatDateValue(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

function formatDateLabel(value: string): string {
  const date = parseDateValue(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
