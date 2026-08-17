import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, PencilIcon, Trash2Icon, UsersIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import {
  formatDiscountRate,
  getCustomerStatusLabel,
  getCustomerTypeLabel,
  type Customer,
} from './customer-data'
import { CustomerStatusBadge } from './customer-data-table'
import { CustomerDeleteDialog } from './customer-delete-dialog'
import { CustomerFormDialog } from './customer-form-dialog'
import { useCustomers } from './customer-store'

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const navigate = useNavigate()
  const { getCustomer, deleteCustomer } = useCustomers()
  const customer = getCustomer(customerId)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!customer) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UsersIcon /></EmptyMedia>
          <EmptyTitle>未找到该签约客户</EmptyTitle>
          <EmptyDescription>客户可能已被删除，或当前链接中的客户 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/fleet-customers" className={buttonVariants()}>返回客户列表</Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <Link to="/fleet-customers" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
            <ArrowLeftIcon data-icon="inline-start" />
            返回客户列表
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{customer.customerName}</h1>
              <Badge variant="secondary">{getCustomerTypeLabel(customer.customerType)}</Badge>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <p className="text-sm text-muted-foreground">{customer.customerCode} · {customer.shortName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <PencilIcon data-icon="inline-start" />
            编辑
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon data-icon="inline-start" />
            删除
          </Button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>客户主体、类型及证照信息。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="客户编号" value={customer.customerCode} />
              <DefinitionItem label="客户类型" value={getCustomerTypeLabel(customer.customerType)} />
              <DefinitionItem label="客户简称" value={customer.shortName} />
              <DefinitionItem label="客户状态" value={getCustomerStatusLabel(customer.status)} />
              <DefinitionItem label="统一社会信用代码" value={customer.unifiedSocialCreditCode} wide />
              <DefinitionItem label="法定代表人" value={customer.legalRepresentative} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>业务与合同</CardTitle>
            <CardDescription>车辆规模、签约日期与合同有效期。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="车辆数" value={customer.vehicleCount === null ? '—' : String(customer.vehicleCount)} />
              <DefinitionItem label="折扣率" value={formatDiscountRate(customer.discountRate)} />
              <DefinitionItem label="签约日期" value={customer.signedAt} />
              <DefinitionItem label="合同开始日期" value={customer.contractStartAt} />
              <DefinitionItem label="合同结束日期" value={customer.contractEndAt} />
              <DefinitionItem label="创建时间" value={formatTimestamp(customer.createdAt)} />
              <DefinitionItem label="更新时间" value={formatTimestamp(customer.updatedAt)} />
              <DefinitionItem label="备注" value={customer.remark || '—'} wide />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>联系人与地址</CardTitle>
            <CardDescription>客户业务对接人与联系地址。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="联系人" value={customer.contactName} />
              <DefinitionItem label="联系电话" value={customer.contactPhone} />
              <DefinitionItem label="联系邮箱" value={customer.contactEmail || '—'} wide />
              <DefinitionItem label="联系地址" value={formatAddress(customer)} wide />
            </dl>
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog open={formOpen} customer={customer} onOpenChange={setFormOpen} />
      <CustomerDeleteDialog
        open={deleteOpen}
        customerName={customer.customerName}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          deleteCustomer(customer.id)
          void navigate({ to: '/fleet-customers', replace: true })
        }}
      />
    </section>
  )
}

function DefinitionItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'sm:col-span-2 xl:col-span-1 2xl:col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}

function formatAddress(customer: Customer): string {
  return [customer.province, customer.city, customer.district, customer.address].filter(Boolean).join(' ')
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
