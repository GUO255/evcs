import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDownIcon, EyeIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  getMembershipStatusLabel,
  getUserAccountStatusLabel,
  membershipStatusOptions,
  userAccountStatusOptions,
  type MembershipStatus,
  type MiniProgramUser,
  type UserAccountStatus,
} from './user-data'

interface UserDataTableProps {
  users: readonly MiniProgramUser[]
}

const userSearchFilter: FilterFn<MiniProgramUser> = (row, _columnId, filterValue) => {
  const keyword = String(filterValue).trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return true
  const user = row.original
  return [user.userCode, user.nickname, user.mobile, user.realName]
    .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
}

export function UserDataTable({ users }: UserDataTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [keyword, setKeyword] = useState('')
  const [membershipFilter, setMembershipFilter] = useState<'all' | MembershipStatus>('all')
  const [accountFilter, setAccountFilter] = useState<'all' | UserAccountStatus>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const data = useMemo(() => [...users], [users])

  const columns = useMemo<ColumnDef<MiniProgramUser>[]>(() => [
    {
      accessorKey: 'userCode',
      header: ({ column }) => (
        <SortableHeader
          label="用户编号"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.userCode}</span>,
    },
    {
      accessorKey: 'nickname',
      header: '用户',
      cell: ({ row }) => <span className="block max-w-48 truncate font-medium">{row.original.nickname}</span>,
    },
    { accessorKey: 'mobile', header: '手机号' },
    {
      accessorKey: 'registeredAt',
      header: ({ column }) => (
        <SortableHeader
          label="注册时间"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.registeredAt)}</span>,
    },
    {
      accessorKey: 'membershipStatus',
      header: '会员状态',
      filterFn: 'equals',
      cell: ({ row }) => <MembershipBadge status={row.original.membershipStatus} />,
    },
    {
      accessorKey: 'points',
      header: ({ column }) => (
        <SortableHeader
          label="积分"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatPoints(row.original.points)}</span>,
    },
    {
      accessorKey: 'storedBalance',
      header: ({ column }) => (
        <SortableHeader
          label="储值余额"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatCurrency(row.original.storedBalance)}</span>,
    },
    {
      accessorKey: 'accountStatus',
      header: '账号状态',
      filterFn: 'equals',
      cell: ({ row }) => <AccountBadge status={row.original.accountStatus} />,
    },
    {
      accessorKey: 'lastActiveAt',
      header: ({ column }) => (
        <SortableHeader
          label="最近活跃"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        />
      ),
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.lastActiveAt)}</span>,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${row.original.nickname}操作菜单`} />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => void navigate({ to: '/users/$userId', params: { userId: row.original.id } })}>
                <EyeIcon />查看详情
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [navigate])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: keyword, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setKeyword,
    onPaginationChange: setPagination,
    globalFilterFn: userSearchFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = table.getPageCount()
  useEffect(() => {
    setPagination((current) => {
      const lastPageIndex = Math.max(0, pageCount - 1)
      return current.pageIndex > lastPageIndex
        ? { ...current, pageIndex: lastPageIndex }
        : current
    })
  }, [pageCount, users.length])

  function changeMembershipFilter(value: string | null) {
    const nextStatus = (value ?? 'all') as 'all' | MembershipStatus
    setMembershipFilter(nextStatus)
    table.getColumn('membershipStatus')?.setFilterValue(nextStatus === 'all' ? undefined : nextStatus)
    table.setPageIndex(0)
  }

  function changeAccountFilter(value: string | null) {
    const nextStatus = (value ?? 'all') as 'all' | UserAccountStatus
    setAccountFilter(nextStatus)
    table.getColumn('accountStatus')?.setFilterValue(nextStatus === 'all' ? undefined : nextStatus)
    table.setPageIndex(0)
  }

  return (
    <Card>
      <CardHeader>
        <ListFilters>
          <ListFilterRow label="会员状态">
            <ListFilterOptionGroup
              ariaLabel="按会员状态筛选"
              options={[{ value: 'all', label: '全部' }, ...membershipStatusOptions]}
              counts={countListFilterValues(users, (user) => user.membershipStatus)}
              hideAllCount
              value={membershipFilter}
              onValueChange={changeMembershipFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="账号状态">
            <ListFilterOptionGroup
              ariaLabel="按账号状态筛选"
              options={[{ value: 'all', label: '全部' }, ...userAccountStatusOptions]}
              counts={countListFilterValues(users, (user) => user.accountStatus)}
              hideAllCount
              value={accountFilter}
              onValueChange={changeAccountFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={keyword}
              onValueChange={(value) => {
                setKeyword(value)
                table.setPageIndex(0)
              }}
              placeholder="搜索用户编号、昵称、手机号或姓名"
              ariaLabel="搜索小程序用户"
            />
          </ListFilterRow>
        </ListFilters>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={header.column.id === 'actions' ? 'text-right' : undefined}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => void navigate({ to: '/users/$userId', params: { userId: row.original.id } })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void navigate({ to: '/users/$userId', params: { userId: row.original.id } })
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={cell.column.id === 'actions' ? (event) => event.stopPropagation() : undefined}
                      onKeyDown={cell.column.id === 'actions' ? (event) => event.stopPropagation() : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                    没有符合当前筛选条件的用户
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          total={table.getFilteredRowModel().rows.length}
          unit="位用户"
          pageIndex={pagination.pageIndex}
          pageCount={pageCount}
          onPageChange={table.setPageIndex}
        />
      </CardContent>
    </Card>
  )
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" className="-ml-2" onClick={onClick}>
      {label}
      <ArrowUpDownIcon data-icon="inline-end" />
    </Button>
  )
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  const variant = status === 'active' ? 'default' : status === 'none' ? 'secondary' : 'destructive'
  return <Badge variant={variant}>{getMembershipStatusLabel(status)}</Badge>
}

export function AccountBadge({ status }: { status: UserAccountStatus }) {
  return <Badge variant={status === 'normal' ? 'default' : 'destructive'}>{getUserAccountStatusLabel(status)}</Badge>
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatPoints(value: number): string {
  return value.toLocaleString('zh-CN')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(value)
}
