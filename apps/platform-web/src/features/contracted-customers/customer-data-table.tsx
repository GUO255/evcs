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
import { ArrowUpDownIcon, EyeIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  customerStatusOptions,
  customerTypeOptions,
  formatDiscountRate,
  getCustomerStatusLabel,
  getCustomerTypeLabel,
  type Customer,
  type CustomerStatus,
  type CustomerType,
} from './customer-data'

interface CustomerDataTableProps {
  customers: readonly Customer[]
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

const customerSearchFilter: FilterFn<Customer> = (row, _columnId, filterValue) => {
  const keyword = String(filterValue).trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return true
  const customer = row.original
  return [
    customer.customerName,
    customer.shortName,
    customer.customerCode,
    customer.unifiedSocialCreditCode,
    customer.contactName,
    customer.contactPhone,
  ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
}

export function CustomerDataTable({ customers, onEdit, onDelete }: CustomerDataTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CustomerType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all')
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const data = useMemo(() => [...customers], [customers])

  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    {
      accessorKey: 'customerCode',
      header: ({ column }) => <SortableHeader label="客户编号" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="font-medium">{row.original.customerCode}</span>,
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => <SortableHeader label="客户名称" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="block max-w-64 truncate font-medium">{row.original.customerName}</span>,
    },
    {
      accessorKey: 'customerType',
      header: '客户类型',
      filterFn: 'equals',
      cell: ({ row }) => <Badge variant="secondary">{getCustomerTypeLabel(row.original.customerType)}</Badge>,
    },
    { accessorKey: 'contactName', header: '联系人' },
    { accessorKey: 'contactPhone', header: '联系电话' },
    {
      accessorKey: 'vehicleCount',
      header: ({ column }) => <SortableHeader label="车辆数" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => row.original.vehicleCount ?? '—',
    },
    {
      accessorKey: 'discountRate',
      header: ({ column }) => <SortableHeader label="折扣率" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDiscountRate(row.original.discountRate)}</span>,
    },
    {
      accessorKey: 'signedAt',
      header: ({ column }) => <SortableHeader label="签约日期" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />,
    },
    {
      accessorKey: 'status',
      header: '状态',
      filterFn: 'equals',
      cell: ({ row }) => <CustomerStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${row.original.customerName}操作菜单`} />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => void navigate({ to: '/fleet-customers/$customerId', params: { customerId: row.original.id } })}>
                <EyeIcon />查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <PencilIcon />编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                <Trash2Icon />删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [navigate, onDelete, onEdit])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: keyword, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setKeyword,
    onPaginationChange: setPagination,
    globalFilterFn: customerSearchFilter,
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
  }, [customers.length, pageCount])

  function changeTypeFilter(value: string | null) {
    const nextType = (value ?? 'all') as 'all' | CustomerType
    setTypeFilter(nextType)
    table.getColumn('customerType')?.setFilterValue(nextType === 'all' ? undefined : nextType)
    table.setPageIndex(0)
  }

  function changeStatusFilter(value: string | null) {
    const nextStatus = (value ?? 'all') as 'all' | CustomerStatus
    setStatusFilter(nextStatus)
    table.getColumn('status')?.setFilterValue(nextStatus === 'all' ? undefined : nextStatus)
    table.setPageIndex(0)
  }

  return (
    <Card>
      <CardHeader>
        <ListFilters>
          <ListFilterRow label="客户类型">
            <ListFilterOptionGroup
              ariaLabel="按客户类型筛选"
              options={[{ value: 'all', label: '全部' }, ...customerTypeOptions]}
              counts={countListFilterValues(customers, (customer) => customer.customerType)}
              hideAllCount
              value={typeFilter}
              onValueChange={changeTypeFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="客户状态">
            <ListFilterOptionGroup
              ariaLabel="按客户状态筛选"
              options={[{ value: 'all', label: '全部' }, ...customerStatusOptions]}
              counts={countListFilterValues(customers, (customer) => customer.status)}
              hideAllCount
              value={statusFilter}
              onValueChange={changeStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={keyword}
              onValueChange={(value) => {
                setKeyword(value)
                table.setPageIndex(0)
              }}
              placeholder="搜索客户名称、编号、信用代码或联系人"
              ariaLabel="搜索签约客户"
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
                  onClick={() => void navigate({ to: '/fleet-customers/$customerId', params: { customerId: row.original.id } })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void navigate({ to: '/fleet-customers/$customerId', params: { customerId: row.original.id } })
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
                    没有符合当前筛选条件的客户
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          total={table.getFilteredRowModel().rows.length}
          unit="家客户"
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

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const variant = status === 'active' ? 'default' : status === 'pending' ? 'secondary' : 'destructive'
  return <Badge variant={variant}>{getCustomerStatusLabel(status)}</Badge>
}
