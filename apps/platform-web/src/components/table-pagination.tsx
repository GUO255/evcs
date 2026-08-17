import { Fragment, useMemo, useState } from 'react'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 10

export function useTablePagination<T>(
  items: readonly T[],
  resetKey: string,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const [pagination, setPagination] = useState({ resetKey, pageIndex: 0 })
  const requestedPageIndex = pagination.resetKey === resetKey ? pagination.pageIndex : 0
  const { pageItems, pageIndex, pageCount } = useMemo(
    () => paginateItems(items, requestedPageIndex, pageSize),
    [items, pageSize, requestedPageIndex],
  )

  function changePage(nextPageIndex: number) {
    const lastPageIndex = Math.max(pageCount - 1, 0)
    setPagination({ resetKey, pageIndex: Math.min(Math.max(nextPageIndex, 0), lastPageIndex) })
  }

  return { pageItems, pageIndex, pageCount, changePage }
}

export function paginateItems<T>(items: readonly T[], requestedPageIndex: number, pageSize = DEFAULT_PAGE_SIZE) {
  const normalizedPageSize = Math.max(Math.floor(pageSize), 1)
  const pageCount = Math.ceil(items.length / normalizedPageSize)
  const pageIndex = Math.min(Math.max(Math.floor(requestedPageIndex), 0), Math.max(pageCount - 1, 0))
  const pageItems = items.slice(pageIndex * normalizedPageSize, (pageIndex + 1) * normalizedPageSize)
  return { pageItems, pageIndex, pageCount }
}

function getVisiblePageIndexes(pageIndex: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index)
  }

  const indexes = new Set([0, pageCount - 1, pageIndex - 1, pageIndex, pageIndex + 1])
  return [...indexes].filter((index) => index >= 0 && index < pageCount).sort((a, b) => a - b)
}

export function TablePagination({
  total,
  unit,
  pageIndex,
  pageCount,
  onPageChange,
}: {
  total: number
  unit: string
  pageIndex: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
}) {
  const visiblePageIndexes = getVisiblePageIndexes(pageIndex, pageCount)
  const previousDisabled = pageIndex === 0
  const nextDisabled = pageCount === 0 || pageIndex >= pageCount - 1

  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>共 {total} {unit}</span>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="上一页"
              aria-label="转到上一页"
              aria-disabled={previousDisabled}
              tabIndex={previousDisabled ? -1 : undefined}
              className={cn(previousDisabled && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (!previousDisabled) onPageChange(pageIndex - 1)
              }}
            />
          </PaginationItem>
          {visiblePageIndexes.map((visiblePageIndex, index) => {
            const previousPageIndex = visiblePageIndexes[index - 1]
            const hasGap = previousPageIndex !== undefined && visiblePageIndex - previousPageIndex > 1

            return (
              <Fragment key={visiblePageIndex}>
                {hasGap ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    aria-label={`转到第 ${visiblePageIndex + 1} 页`}
                    isActive={visiblePageIndex === pageIndex}
                    onClick={(event) => {
                      event.preventDefault()
                      onPageChange(visiblePageIndex)
                    }}
                  >
                    {visiblePageIndex + 1}
                  </PaginationLink>
                </PaginationItem>
              </Fragment>
            )
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="下一页"
              aria-label="转到下一页"
              aria-disabled={nextDisabled}
              tabIndex={nextDisabled ? -1 : undefined}
              className={cn(nextDisabled && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (!nextDisabled) onPageChange(pageIndex + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function CursorTablePagination({
  summary,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
}: {
  summary: string
  previousDisabled: boolean
  nextDisabled: boolean
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>{summary}</span>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="上一页"
              aria-label="转到上一页"
              aria-disabled={previousDisabled}
              tabIndex={previousDisabled ? -1 : undefined}
              className={cn(previousDisabled && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (!previousDisabled) onPrevious()
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              text="下一页"
              aria-label="转到下一页"
              aria-disabled={nextDisabled}
              tabIndex={nextDisabled ? -1 : undefined}
              className={cn(nextDisabled && 'pointer-events-none opacity-50')}
              onClick={(event) => {
                event.preventDefault()
                if (!nextDisabled) onNext()
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
