import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ArrowUpDownIcon,
  PowerIcon,
  ShoppingBasketIcon,
  Trash2Icon,
} from '@/components/ui/icons'
import { toast } from 'sonner'

import { SingleProductImageField } from '@/components/single-product-image-field'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  mallProductCategoryFilterOptions,
  mallProductCategoryLabels,
  mallProductKindFilterOptions,
  mallProductKindLabels,
} from './mall-data'
import { MallProductDeleteDialog } from './mall-product-delete-dialog'
import {
  deleteMallProduct,
  setMallProductSortOrder,
  toggleMallProduct,
  updateMallProduct,
  useMallProducts,
} from './mall-products-store'
import type {
  MallProduct,
  MallProductCategory,
  MallProductInput,
  MallProductKind,
  MallProductStatus,
} from './mall-types'

interface FormState {
  imageUrl: string
  sku: string
  name: string
  kind: MallProductKind
  category: MallProductCategory
  price: string
  compareAtPrice: string
  stock: string
  description: string
  status: MallProductStatus
}

type FormErrors = Partial<Record<
  'imageUrl' | 'sku' | 'name' | 'price' | 'compareAtPrice' | 'stock' | 'description',
  string
>>

function productToForm(product: MallProduct | undefined): FormState {
  return {
    imageUrl: product?.imageUrl ?? '',
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    kind: product?.kind ?? 'physical',
    category: product?.category ?? 'charging-accessory',
    price: product ? (product.priceCents / 100).toFixed(2) : '',
    compareAtPrice: product ? (product.compareAtPriceCents / 100).toFixed(2) : '',
    stock: product ? String(product.stock) : '',
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

export function MallProductDetailPage({ productId }: { productId: string }) {
  const navigate = useNavigate()
  const products = useMallProducts()
  const product = products.find((candidate) => candidate.id === productId)
  const [form, setForm] = useState<FormState>(() => productToForm(product))
  const [errors, setErrors] = useState<FormErrors>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sortDialogOpen, setSortDialogOpen] = useState(false)
  const [sortOrderInput, setSortOrderInput] = useState('')
  const [sortOrderError, setSortOrderError] = useState<string>()

  if (!product) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShoppingBasketIcon /></EmptyMedia>
          <EmptyTitle>未找到该商城商品</EmptyTitle>
          <EmptyDescription>商品可能已被删除，或当前链接中的商品 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/mall" className={buttonVariants()}>返回商城</Link>
        </EmptyContent>
      </Empty>
    )
  }

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...((key === 'price' || key === 'compareAtPrice')
        ? { compareAtPrice: undefined }
        : {}),
    }))
  }

  function saveProduct() {
    const sku = form.sku.trim()
    const priceCents = parseDecimalToCents(form.price)
    const compareAtPriceCents = parseDecimalToCents(form.compareAtPrice)
    const stock = parseNonnegativeInteger(form.stock)
    const nextErrors: FormErrors = {}

    if (!form.imageUrl) nextErrors.imageUrl = '请上传商品图片'
    if (!sku) {
      nextErrors.sku = '请输入商品 SKU'
    } else if (products.some((candidate) =>
      candidate.id !== productId
      && candidate.sku.trim().toLocaleLowerCase('en-US') === sku.toLocaleLowerCase('en-US'))) {
      nextErrors.sku = '商品 SKU 已存在'
    }
    if (!form.name.trim()) nextErrors.name = '请输入商品名称'
    if (priceCents === undefined) nextErrors.price = '销售价必须为非负数，且最多保留两位小数'
    if (compareAtPriceCents === undefined) {
      nextErrors.compareAtPrice = '划线价必须为非负数，且最多保留两位小数'
    } else if (priceCents !== undefined && compareAtPriceCents < priceCents) {
      nextErrors.compareAtPrice = '划线价不能低于销售价'
    }
    if (stock === undefined) nextErrors.stock = '库存必须为非负整数'
    if (!form.description.trim()) nextErrors.description = '请输入商品说明'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input: MallProductInput = {
      imageUrl: form.imageUrl,
      sku,
      name: form.name.trim(),
      kind: form.kind,
      category: form.category,
      priceCents: priceCents as number,
      compareAtPriceCents: compareAtPriceCents as number,
      stock: stock as number,
      description: form.description.trim(),
      status: form.status,
    }
    updateMallProduct(productId, input)
    toast.success('商城商品已保存')
  }

  function openSortDialog(currentSortOrder: number) {
    setSortOrderInput(String(currentSortOrder))
    setSortOrderError(undefined)
    setSortDialogOpen(true)
  }

  function confirmSortOrder() {
    const normalized = sortOrderInput.trim()
    const sortOrder = Number(normalized)

    if (!/^\d+$/.test(normalized) || sortOrder < 1 || sortOrder > products.length) {
      setSortOrderError(`请输入 1 至 ${products.length} 的整数`)
      return
    }

    setMallProductSortOrder(productId, sortOrder)
    setSortDialogOpen(false)
    toast.success(`商品顺序已调整为 ${sortOrder}`)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/mall" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回商城
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name} · {product.sku} · {mallProductKindLabels[product.kind]} / {mallProductCategoryLabels[product.category]}
            </h1>
            <Badge variant={product.status === 'enabled' ? 'default' : 'destructive'}>
              {product.status === 'enabled' ? '在售' : '已下架'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={product.status === 'enabled' ? 'destructive' : 'default'}
              onClick={() => {
                const nextStatus = product.status === 'enabled' ? 'disabled' : 'enabled'
                toggleMallProduct(product.id)
                setForm((current) => ({ ...current, status: nextStatus }))
                toast.success(nextStatus === 'enabled' ? '商品已上架' : '商品已下架')
              }}
            >
              <PowerIcon data-icon="inline-start" />
              {product.status === 'enabled' ? '下架' : '上架'}
            </Button>
            <Button variant="outline" onClick={() => openSortDialog(product.sortOrder)}>
              <ArrowUpDownIcon data-icon="inline-start" />
              调整顺序
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon data-icon="inline-start" />
              删除
            </Button>
          </div>
        </div>
      </header>

      <Card>
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
                  id="mall-detail-image"
                  value={form.imageUrl}
                  error={errors.imageUrl}
                  previewTitle={product.name}
                  onChange={(value) => updateForm('imageUrl', value)}
                />
              </div>
              <Field data-invalid={Boolean(errors.sku)}>
                <FieldLabel htmlFor="mall-detail-sku">商品 SKU</FieldLabel>
                <Input id="mall-detail-sku" value={form.sku} onChange={(event) => updateForm('sku', event.target.value)} aria-invalid={Boolean(errors.sku)} />
                <FieldError>{errors.sku}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="mall-detail-name">商品名称</FieldLabel>
                <Input id="mall-detail-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} aria-invalid={Boolean(errors.name)} />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="mall-detail-kind">商品类型</FieldLabel>
                <Select value={form.kind} onValueChange={(value) => updateForm('kind', value as MallProductKind)}>
                  <SelectTrigger id="mall-detail-kind" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {mallProductKindFilterOptions.filter((option) => option.value !== 'all').map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="mall-detail-category">商品分类</FieldLabel>
                <Select value={form.category} onValueChange={(value) => updateForm('category', value as MallProductCategory)}>
                  <SelectTrigger id="mall-detail-category" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {mallProductCategoryFilterOptions.filter((option) => option.value !== 'all').map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errors.price)}>
                <FieldLabel htmlFor="mall-detail-price">销售价（元）</FieldLabel>
                <Input id="mall-detail-price" inputMode="decimal" value={form.price} onChange={(event) => updateForm('price', event.target.value)} aria-invalid={Boolean(errors.price)} />
                <FieldError>{errors.price}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.compareAtPrice)}>
                <FieldLabel htmlFor="mall-detail-compare-price">划线价（元）</FieldLabel>
                <Input id="mall-detail-compare-price" inputMode="decimal" value={form.compareAtPrice} onChange={(event) => updateForm('compareAtPrice', event.target.value)} aria-invalid={Boolean(errors.compareAtPrice)} />
                <FieldError>{errors.compareAtPrice}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.stock)}>
                <FieldLabel htmlFor="mall-detail-stock">库存</FieldLabel>
                <Input id="mall-detail-stock" inputMode="numeric" value={form.stock} onChange={(event) => updateForm('stock', event.target.value)} aria-invalid={Boolean(errors.stock)} />
                <FieldError>{errors.stock}</FieldError>
              </Field>
              <Field className="lg:col-span-2" data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="mall-detail-description">商品说明</FieldLabel>
                <Textarea id="mall-detail-description" rows={4} value={form.description} onChange={(event) => updateForm('description', event.target.value)} aria-invalid={Boolean(errors.description)} />
                <FieldError>{errors.description}</FieldError>
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Link to="/mall" className={buttonVariants({ variant: 'outline' })}>取消</Link>
              <Button type="submit">保存修改</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <MallProductDeleteDialog
        open={deleteOpen}
        productName={product.name}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          const deletedProductName = product.name
          deleteMallProduct(product.id)
          setDeleteOpen(false)
          toast.success(`“${deletedProductName}”已删除`)
          void navigate({ to: '/mall', replace: true })
        }}
      />

      <Dialog
        open={sortDialogOpen}
        onOpenChange={(open) => {
          setSortDialogOpen(open)
          if (!open) setSortOrderError(undefined)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              confirmSortOrder()
            }}
          >
            <DialogHeader>
              <DialogTitle>调整商品顺序</DialogTitle>
              <DialogDescription>
                当前顺序为 {product.sortOrder}，请输入新的展示顺序。
              </DialogDescription>
            </DialogHeader>
            <Field data-invalid={Boolean(sortOrderError)}>
              <FieldLabel htmlFor="mall-detail-sort-order">目标顺序</FieldLabel>
              <Input
                id="mall-detail-sort-order"
                type="number"
                inputMode="numeric"
                min={1}
                max={products.length}
                step={1}
                value={sortOrderInput}
                aria-invalid={Boolean(sortOrderError)}
                onChange={(event) => {
                  setSortOrderInput(event.target.value)
                  setSortOrderError(undefined)
                }}
              />
              <FieldDescription>可输入 1 至 {products.length}。</FieldDescription>
              <FieldError>{sortOrderError}</FieldError>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSortDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">确认调整</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
