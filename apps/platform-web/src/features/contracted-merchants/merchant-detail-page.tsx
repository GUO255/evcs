import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, Building2Icon, PencilIcon, Trash2Icon } from '@/components/ui/icons'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import { getMerchantStatusLabel, type Merchant } from './merchant-data'
import { MerchantStatusBadge } from './merchant-data-table'
import { MerchantDeleteDialog } from './merchant-delete-dialog'
import { MerchantFormDialog } from './merchant-form-dialog'
import { useMerchants } from './merchant-store'

export function MerchantDetailPage({ merchantId }: { merchantId: string }) {
  const navigate = useNavigate()
  const { getMerchant, deleteMerchant } = useMerchants()
  const merchant = getMerchant(merchantId)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!merchant) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Building2Icon /></EmptyMedia>
          <EmptyTitle>未找到该签约商户</EmptyTitle>
          <EmptyDescription>商户可能已被删除，或当前链接中的商户 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/contracted-merchants" className={buttonVariants()}>返回商户列表</Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <Link to="/contracted-merchants" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
            <ArrowLeftIcon data-icon="inline-start" />
            返回商户列表
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{merchant.companyName}</h1>
              <MerchantStatusBadge status={merchant.status} />
            </div>
            <p className="text-sm text-muted-foreground">{merchant.merchantCode} · {merchant.shortName}</p>
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
            <CardTitle>企业基本信息</CardTitle>
            <CardDescription>企业主体、证照与经营地址。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="商户编号" value={merchant.merchantCode} />
              <DefinitionItem label="企业简称" value={merchant.shortName} />
              <DefinitionItem label="统一社会信用代码" value={merchant.unifiedSocialCreditCode} wide />
              <DefinitionItem label="法定代表人" value={merchant.legalRepresentative} />
              <DefinitionItem label="商户状态" value={getMerchantStatusLabel(merchant.status)} />
              <DefinitionItem label="经营地址" value={formatAddress(merchant)} wide />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>合同信息</CardTitle>
            <CardDescription>签约日期与当前合同有效期。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="签约日期" value={merchant.signedAt} />
              <DefinitionItem label="合同开始日期" value={merchant.contractStartAt} />
              <DefinitionItem label="合同结束日期" value={merchant.contractEndAt} />
              <DefinitionItem label="创建时间" value={formatTimestamp(merchant.createdAt)} />
              <DefinitionItem label="更新时间" value={formatTimestamp(merchant.updatedAt)} wide />
              <DefinitionItem label="备注" value={merchant.remark || '—'} wide />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>联系人信息</CardTitle>
            <CardDescription>商户业务对接人的联系方式。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <DefinitionItem label="联系人" value={merchant.contactName} />
              <DefinitionItem label="联系电话" value={merchant.contactPhone} />
              <DefinitionItem label="联系邮箱" value={merchant.contactEmail || '—'} wide />
            </dl>
          </CardContent>
        </Card>
      </div>

      <MerchantFormDialog open={formOpen} merchant={merchant} onOpenChange={setFormOpen} />
      <MerchantDeleteDialog
        open={deleteOpen}
        merchantName={merchant.companyName}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          deleteMerchant(merchant.id)
          void navigate({ to: '/contracted-merchants', replace: true })
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

function formatAddress(merchant: Merchant): string {
  return [merchant.province, merchant.city, merchant.district, merchant.address].filter(Boolean).join(' ')
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
