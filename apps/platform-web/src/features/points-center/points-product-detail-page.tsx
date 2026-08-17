import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, GiftIcon } from '@/components/ui/icons'
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
  pointsProductTypeLabels,
  pointsProductTypeOptions,
} from './points-center-data'
import { updatePointsProduct, usePointsProducts } from './points-products-store'
import type {
  PointsProduct,
  PointsProductInput,
  PointsProductStatus,
  PointsProductType,
} from './points-center-types'

interface FormState {
  imageUrl: string
  name: string
  type: PointsProductType
  pointsCost: string
  referenceValue: string
  stock: string
  perUserLimit: string
  description: string
  status: PointsProductStatus
}

type FormErrors = Partial<Record<
  'imageUrl' | 'name' | 'pointsCost' | 'referenceValue' | 'stock' | 'perUserLimit' | 'description',
  string
>>

function productToForm(product: PointsProduct | undefined): FormState {
  return {
    imageUrl: product?.imageUrl ?? '',
    name: product?.name ?? '',
    type: product?.type ?? 'virtual',
    pointsCost: product ? String(product.pointsCost) : '',
    referenceValue: product ? (product.referenceValueCents / 100).toFixed(2) : '',
    stock: product ? String(product.stock) : '',
    perUserLimit: product ? String(product.perUserLimit) : '',
    description: product?.description ?? '',
    status: product?.status ?? 'disabled',
  }
}

function parseDecimalToCents(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined
  const [whole = '0', fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : undefined
}

function parseNonnegativeInteger(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return undefined
  const number = Number(normalized)
  return Number.isSafeInteger(number) ? number : undefined
}

export function PointsProductDetailPage({ productId }: { productId: string }) {
  const products = usePointsProducts()
  const product = products.find((candidate) => candidate.id === productId)
  const [form, setForm] = useState<FormState>(() => productToForm(product))
  const [errors, setErrors] = useState<FormErrors>({})

  if (!product) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><GiftIcon /></EmptyMedia>
          <EmptyTitle>未找到该积分兑换商品</EmptyTitle>
          <EmptyDescription>商品可能已被删除，或当前链接中的商品 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/points-center" className={buttonVariants()}>返回积分</Link>
        </EmptyContent>
      </Empty>
    )
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function saveProduct() {
    const pointsCost = parseNonnegativeInteger(form.pointsCost)
    const referenceValueCents = parseDecimalToCents(form.referenceValue)
    const stock = parseNonnegativeInteger(form.stock)
    const perUserLimit = parseNonnegativeInteger(form.perUserLimit)
    const nextErrors: FormErrors = {}

    if (!form.imageUrl) nextErrors.imageUrl = '请上传商品图片'
    if (!form.name.trim()) nextErrors.name = '请输入商品名称'
    if (!pointsCost || pointsCost <= 0) nextErrors.pointsCost = '兑换积分必须为正整数'
    if (referenceValueCents === undefined) {
      nextErrors.referenceValue = '参考价值必须为非负数，且最多保留两位小数'
    }
    if (stock === undefined) nextErrors.stock = '库存必须为非负整数'
    if (!perUserLimit || perUserLimit <= 0) nextErrors.perUserLimit = '每人限兑必须为正整数'
    if (!form.description.trim()) nextErrors.description = '请输入商品说明'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input: PointsProductInput = {
      imageUrl: form.imageUrl,
      name: form.name.trim(),
      type: form.type,
      pointsCost: pointsCost as number,
      referenceValueCents: referenceValueCents as number,
      stock: stock as number,
      perUserLimit: perUserLimit as number,
      description: form.description.trim(),
      status: form.status,
    }
    updatePointsProduct(productId, input)
    toast.success('积分兑换商品已保存')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          to="/points-center"
          className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          返回积分
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">编辑积分兑换商品</h1>
          <Badge variant={product.status === 'enabled' ? 'default' : 'destructive'}>
            {product.status === 'enabled' ? '上架' : '已下架'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {product.name} · {pointsProductTypeLabels[product.type]}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>商品信息</CardTitle>
          <CardDescription>修改兑换规则、库存和小程序展示信息。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-6"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              saveProduct()
            }}
          >
            <FieldGroup className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <SingleProductImageField
                  id="points-detail-image"
                  value={form.imageUrl}
                  error={errors.imageUrl}
                  onChange={(value) => updateForm('imageUrl', value)}
                />
              </div>
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="points-detail-name">商品名称</FieldLabel>
                <Input id="points-detail-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="points-detail-type">商品类型</FieldLabel>
                <Select value={form.type} onValueChange={(value) => updateForm('type', value as PointsProductType)}>
                  <SelectTrigger id="points-detail-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {pointsProductTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errors.pointsCost)}>
                <FieldLabel htmlFor="points-detail-cost">兑换积分</FieldLabel>
                <Input id="points-detail-cost" inputMode="numeric" value={form.pointsCost} onChange={(event) => updateForm('pointsCost', event.target.value)} aria-invalid={Boolean(errors.pointsCost)} />
                <FieldError>{errors.pointsCost}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.referenceValue)}>
                <FieldLabel htmlFor="points-detail-value">参考价值（元）</FieldLabel>
                <Input id="points-detail-value" inputMode="decimal" value={form.referenceValue} onChange={(event) => updateForm('referenceValue', event.target.value)} aria-invalid={Boolean(errors.referenceValue)} />
                <FieldError>{errors.referenceValue}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.stock)}>
                <FieldLabel htmlFor="points-detail-stock">库存</FieldLabel>
                <Input id="points-detail-stock" inputMode="numeric" value={form.stock} onChange={(event) => updateForm('stock', event.target.value)} aria-invalid={Boolean(errors.stock)} />
                <FieldError>{errors.stock}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.perUserLimit)}>
                <FieldLabel htmlFor="points-detail-limit">每人限兑</FieldLabel>
                <Input id="points-detail-limit" inputMode="numeric" value={form.perUserLimit} onChange={(event) => updateForm('perUserLimit', event.target.value)} aria-invalid={Boolean(errors.perUserLimit)} />
                <FieldError>{errors.perUserLimit}</FieldError>
              </Field>
              <Field className="lg:col-span-2" data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="points-detail-description">商品说明</FieldLabel>
                <Textarea id="points-detail-description" rows={4} value={form.description} onChange={(event) => updateForm('description', event.target.value)} aria-invalid={Boolean(errors.description)} />
                <FieldError>{errors.description}</FieldError>
              </Field>
              <Field orientation="horizontal" className="lg:col-span-2 rounded-lg border p-4">
                <FieldLabel htmlFor="points-detail-enabled" className="flex-1">上架状态</FieldLabel>
                <Switch id="points-detail-enabled" checked={form.status === 'enabled'} onCheckedChange={(checked) => updateForm('status', checked ? 'enabled' : 'disabled')} />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Link to="/points-center" className={buttonVariants({ variant: 'outline' })}>取消</Link>
              <Button type="submit">保存修改</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
