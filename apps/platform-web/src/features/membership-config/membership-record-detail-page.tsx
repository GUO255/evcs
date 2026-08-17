import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  Clock3Icon,
  CrownIcon,
  HeadsetIcon,
  TicketsIcon,
  WalletCardsIcon,
} from '@/components/ui/icons'
import { toast } from 'sonner'

import { SingleProductImageField } from '@/components/single-product-image-field'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  updateMembershipBenefit,
  updateMembershipProduct,
  updateMembershipStationPrice,
  useMembershipConfig,
} from './membership-config-store'
import type {
  MembershipBenefit,
  MembershipBenefitIcon,
  MembershipProduct,
  MembershipProductType,
  MembershipStationPrice,
} from './membership-config-types'

export type MembershipResourceType = 'products' | 'benefits' | 'prices'

const productTypeOptions = [
  { label: '自动续费', value: 'auto-renew' },
  { label: '单次购买', value: 'one-time' },
] as const

const benefitIconOptions = [
  { label: '钱包卡片', value: 'wallet', icon: WalletCardsIcon },
  { label: '优惠券', value: 'ticket', icon: TicketsIcon },
  { label: '时钟', value: 'clock', icon: Clock3Icon },
  { label: '客服耳机', value: 'headset', icon: HeadsetIcon },
] as const

export function MembershipRecordDetailPage({
  resourceType,
  recordId,
}: {
  resourceType: MembershipResourceType
  recordId: string
}) {
  const config = useMembershipConfig()

  if (resourceType === 'products') {
    const product = config.products.find((record) => record.id === recordId)
    return product ? <ProductEditor product={product} /> : <MissingRecord />
  }
  if (resourceType === 'benefits') {
    const benefit = config.benefits.find((record) => record.id === recordId)
    return benefit ? <BenefitEditor benefit={benefit} /> : <MissingRecord />
  }

  const price = config.stationPrices.find((record) => record.id === recordId)
  return price ? <PriceEditor price={price} /> : <MissingRecord />
}

function DetailHeader({
  title,
  name,
  enabled,
}: {
  title: string
  name: string
  enabled: boolean
}) {
  return (
    <header className="flex flex-col gap-3">
      <Link to="/membership-config" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
        <ArrowLeftIcon data-icon="inline-start" />
        返回会员配置
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Badge variant={enabled ? 'default' : 'destructive'}>
          {enabled ? '已启用' : '已停用'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{name}</p>
    </header>
  )
}

function ProductEditor({ product }: { product: MembershipProduct }) {
  const [form, setForm] = useState(() => ({
    imageUrl: product.imageUrl,
    name: product.name,
    type: product.type,
    salePrice: String(product.salePrice),
    originalPrice: String(product.originalPrice),
    renewalPrice: String(product.renewalPrice),
    durationDays: String(product.durationDays),
    marketingLabel: product.marketingLabel,
    enabled: product.status === 'enabled',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const salePrice = Number(form.salePrice)
    const originalPrice = Number(form.originalPrice)
    const renewalPrice = form.type === 'one-time' ? 0 : Number(form.renewalPrice)
    const durationDays = Number(form.durationDays)
    const nextErrors: Record<string, string> = {}
    if (!form.imageUrl) nextErrors.imageUrl = '请上传商品图片'
    if (!form.name.trim()) nextErrors.name = '请输入商品名称'
    if (!Number.isFinite(salePrice) || salePrice < 0) nextErrors.salePrice = '销售价必须为非负数'
    if (!Number.isFinite(originalPrice) || originalPrice < salePrice) nextErrors.originalPrice = '原价必须大于或等于销售价'
    if (form.type === 'auto-renew' && (!Number.isFinite(renewalPrice) || renewalPrice < 0)) nextErrors.renewalPrice = '续费价必须为非负数'
    if (!Number.isInteger(durationDays) || durationDays <= 0) nextErrors.durationDays = '有效期必须为正整数'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    updateMembershipProduct(product.id, {
      imageUrl: form.imageUrl,
      name: form.name.trim(),
      type: form.type,
      salePrice,
      originalPrice,
      renewalPrice,
      durationDays,
      marketingLabel: form.marketingLabel.trim(),
      status: form.enabled ? 'enabled' : 'disabled',
    })
    toast.success('会员商品已保存')
  }

  return (
    <section className="flex flex-col gap-6">
      <DetailHeader title="编辑会员商品" name={product.name} enabled={product.status === 'enabled'} />
      <EditorCard description="修改会员商品的展示信息、价格周期和销售状态。">
        <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
          <FieldGroup className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <SingleProductImageField id="membership-detail-image" value={form.imageUrl} error={errors.imageUrl} onChange={(value) => update('imageUrl', value)} />
            </div>
            <TextInput id="membership-detail-name" label="商品名称" value={form.name} error={errors.name} onChange={(value) => update('name', value)} />
            <Field>
              <FieldLabel htmlFor="membership-detail-type">商品类型</FieldLabel>
              <Select items={productTypeOptions} value={form.type} onValueChange={(value) => update('type', value as MembershipProductType)}>
                <SelectTrigger id="membership-detail-type" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{productTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <TextInput id="membership-detail-sale" label="销售价（元）" value={form.salePrice} error={errors.salePrice} inputMode="decimal" onChange={(value) => update('salePrice', value)} />
            <TextInput id="membership-detail-original" label="原价（元）" value={form.originalPrice} error={errors.originalPrice} inputMode="decimal" onChange={(value) => update('originalPrice', value)} />
            <TextInput id="membership-detail-renewal" label="续费价（元）" value={form.renewalPrice} error={errors.renewalPrice} inputMode="decimal" disabled={form.type === 'one-time'} onChange={(value) => update('renewalPrice', value)} />
            <TextInput id="membership-detail-duration" label="有效期（天）" value={form.durationDays} error={errors.durationDays} inputMode="numeric" onChange={(value) => update('durationDays', value)} />
            <TextInput id="membership-detail-label" label="营销标签" value={form.marketingLabel} onChange={(value) => update('marketingLabel', value)} />
            <StatusSwitch id="membership-detail-enabled" label="在售状态" checked={form.enabled} onChange={(value) => update('enabled', value)} />
          </FieldGroup>
          <EditorFooter />
        </form>
      </EditorCard>
    </section>
  )
}

function BenefitEditor({ benefit }: { benefit: MembershipBenefit }) {
  const [form, setForm] = useState(() => ({
    name: benefit.name,
    icon: benefit.icon,
    summary: benefit.summary,
    description: benefit.description,
    enabled: benefit.status === 'enabled',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = '请输入权益名称'
    if (!form.summary.trim()) nextErrors.summary = '请输入权益摘要'
    if (!form.description.trim()) nextErrors.description = '请输入权益说明'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    updateMembershipBenefit(benefit.id, {
      name: form.name.trim(),
      icon: form.icon,
      summary: form.summary.trim(),
      description: form.description.trim(),
      status: form.enabled ? 'enabled' : 'disabled',
    })
    toast.success('会员权益已保存')
  }

  return (
    <section className="flex flex-col gap-6">
      <DetailHeader title="编辑会员权益" name={benefit.name} enabled={benefit.status === 'enabled'} />
      <EditorCard description="修改权益名称、图标、小程序说明和启用状态。">
        <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
          <FieldGroup className="grid gap-5 lg:grid-cols-2">
            <TextInput id="benefit-detail-name" label="权益名称" value={form.name} error={errors.name} onChange={(value) => update('name', value)} />
            <Field>
              <FieldLabel htmlFor="benefit-detail-icon">权益图标</FieldLabel>
              <Select items={benefitIconOptions} value={form.icon} onValueChange={(value) => update('icon', value as MembershipBenefitIcon)}>
                <SelectTrigger id="benefit-detail-icon" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {benefitIconOptions.map((option) => {
                      const Icon = option.icon
                      return <SelectItem key={option.value} value={option.value}><Icon />{option.label}</SelectItem>
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <TextInput id="benefit-detail-summary" label="权益摘要" value={form.summary} error={errors.summary} onChange={(value) => update('summary', value)} />
            <StatusSwitch id="benefit-detail-enabled" label="启用状态" checked={form.enabled} onChange={(value) => update('enabled', value)} />
            <Field className="lg:col-span-2" data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="benefit-detail-description">权益说明</FieldLabel>
              <Textarea id="benefit-detail-description" rows={5} value={form.description} onChange={(event) => update('description', event.target.value)} aria-invalid={Boolean(errors.description)} />
              <FieldError>{errors.description}</FieldError>
            </Field>
          </FieldGroup>
          <EditorFooter />
        </form>
      </EditorCard>
    </section>
  )
}

function PriceEditor({ price }: { price: MembershipStationPrice }) {
  const [form, setForm] = useState(() => ({
    city: price.city,
    stationName: price.stationName,
    originalPrice: String(price.originalPrice),
    memberPrice: String(price.memberPrice),
    enabled: price.status === 'enabled',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function update<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const originalPrice = Number(form.originalPrice)
    const memberPrice = Number(form.memberPrice)
    const nextErrors: Record<string, string> = {}
    if (!form.city.trim()) nextErrors.city = '请输入城市'
    if (!form.stationName.trim()) nextErrors.stationName = '请输入场站名称'
    if (!Number.isFinite(originalPrice) || originalPrice < 0) nextErrors.originalPrice = '原价必须为非负数'
    if (!Number.isFinite(memberPrice) || memberPrice < 0 || memberPrice > originalPrice) nextErrors.memberPrice = '会员价必须为非负数且不能高于原价'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    updateMembershipStationPrice(price.id, {
      city: form.city.trim(),
      stationName: form.stationName.trim(),
      originalPrice,
      memberPrice,
      status: form.enabled ? 'enabled' : 'disabled',
    })
    toast.success('场站会员专享价已保存')
  }

  return (
    <section className="flex flex-col gap-6">
      <DetailHeader title="编辑场站会员专享价" name={price.stationName} enabled={price.status === 'enabled'} />
      <EditorCard description="修改场站范围、会员充电价格和启用状态。">
        <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
          <FieldGroup className="grid gap-5 lg:grid-cols-2">
            <TextInput id="price-detail-city" label="城市" value={form.city} error={errors.city} onChange={(value) => update('city', value)} />
            <TextInput id="price-detail-station" label="场站名称" value={form.stationName} error={errors.stationName} onChange={(value) => update('stationName', value)} />
            <TextInput id="price-detail-original" label="原价（元/度）" value={form.originalPrice} error={errors.originalPrice} inputMode="decimal" onChange={(value) => update('originalPrice', value)} />
            <TextInput id="price-detail-member" label="会员价（元/度）" value={form.memberPrice} error={errors.memberPrice} inputMode="decimal" onChange={(value) => update('memberPrice', value)} />
            <StatusSwitch id="price-detail-enabled" label="启用状态" checked={form.enabled} onChange={(value) => update('enabled', value)} />
          </FieldGroup>
          <EditorFooter />
        </form>
      </EditorCard>
    </section>
  )
}

function EditorCard({ description, children }: { description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>配置信息</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function TextInput({
  id,
  label,
  value,
  error,
  inputMode,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  inputMode?: React.ComponentProps<typeof Input>['inputMode']
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} inputMode={inputMode} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function StatusSwitch({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Field orientation="horizontal" className="rounded-lg border p-4">
      <FieldLabel htmlFor={id} className="flex-1">{label}</FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  )
}

function EditorFooter() {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Link to="/membership-config" className={buttonVariants({ variant: 'outline' })}>取消</Link>
      <Button type="submit">保存修改</Button>
    </div>
  )
}

function MissingRecord() {
  return (
    <Empty className="min-h-96 border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><CrownIcon /></EmptyMedia>
        <EmptyTitle>未找到该会员配置</EmptyTitle>
        <EmptyDescription>记录可能已被删除，或当前链接无效。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><Link to="/membership-config" className={buttonVariants()}>返回会员配置</Link></EmptyContent>
    </Empty>
  )
}
