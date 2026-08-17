import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
} from '@/components/ui/icons'
import { toast } from 'sonner'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { SingleProductImageField } from '@/components/single-product-image-field'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type {
  MembershipProduct,
  MembershipProductInput,
  MembershipProductType,
  MembershipRecordStatus,
} from './membership-config-types'

type StatusFilter = MembershipRecordStatus | 'all'
type MoveDirection = 'up' | 'down'

interface MembershipProductsSectionProps {
  products: readonly MembershipProduct[]
  onCreate: (input: MembershipProductInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (product: MembershipProduct) => void
}

interface ProductFormState {
  imageUrl: string
  name: string
  type: MembershipProductType
  salePrice: string
  originalPrice: string
  renewalPrice: string
  durationDays: string
  marketingLabel: string
  enabled: boolean
}

type ProductFormErrors = Partial<Record<
  'imageUrl' | 'name' | 'salePrice' | 'originalPrice' | 'renewalPrice' | 'durationDays',
  string
>>

const productTypeOptions = [
  { label: '自动续费', value: 'auto-renew' },
  { label: '单次购买', value: 'one-time' },
] as const satisfies readonly { label: string; value: MembershipProductType }[]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '在售', value: 'enabled' },
  { label: '已下架', value: 'disabled' },
] as const satisfies readonly { label: string; value: StatusFilter }[]

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

function emptyFormState(): ProductFormState {
  return {
    imageUrl: '',
    name: '',
    type: 'auto-renew',
    salePrice: '',
    originalPrice: '',
    renewalPrice: '',
    durationDays: '',
    marketingLabel: '',
    enabled: true,
  }
}

function productTypeLabel(type: MembershipProductType) {
  return productTypeOptions.find((option) => option.value === type)?.label ?? ''
}

function validateForm(values: ProductFormState) {
  const errors: ProductFormErrors = {}
  const salePrice = Number(values.salePrice)
  const originalPrice = Number(values.originalPrice)
  const renewalPrice = values.type === 'one-time' ? 0 : Number(values.renewalPrice)
  const durationDays = Number(values.durationDays)

  if (!values.imageUrl) {
    errors.imageUrl = '请上传商品图片'
  }

  if (!values.name.trim()) {
    errors.name = '请输入商品名称'
  }

  if (values.salePrice.trim() === '' || !Number.isFinite(salePrice) || salePrice < 0) {
    errors.salePrice = '销售价必须为非负数'
  }

  if (
    values.originalPrice.trim() === ''
    || !Number.isFinite(originalPrice)
    || originalPrice < salePrice
  ) {
    errors.originalPrice = '原价必须大于或等于销售价'
  }

  if (
    values.type === 'auto-renew'
    && (
      values.renewalPrice.trim() === ''
      || !Number.isFinite(renewalPrice)
      || renewalPrice < 0
    )
  ) {
    errors.renewalPrice = '续费价必须为非负数'
  }

  if (
    values.durationDays.trim() === ''
    || !Number.isInteger(durationDays)
    || durationDays <= 0
  ) {
    errors.durationDays = '有效期必须为正整数'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const input: MembershipProductInput = {
    imageUrl: values.imageUrl,
    name: values.name.trim(),
    type: values.type,
    salePrice,
    originalPrice,
    renewalPrice,
    durationDays,
    marketingLabel: values.marketingLabel.trim(),
    status: values.enabled ? 'enabled' : 'disabled',
  }

  return { errors, input }
}

export function MembershipProductsSection({
  products,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: MembershipProductsSectionProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<MembershipProduct>()
  const [form, setForm] = useState<ProductFormState>(emptyFormState)
  const [errors, setErrors] = useState<ProductFormErrors>({})

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all'
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-CN')

    return products.filter((product) => {
      if (statusFilter !== 'all' && product.status !== statusFilter) {
        return false
      }

      if (!query) {
        return true
      }

      const searchableText = [
        product.name,
        productTypeLabel(product.type),
        product.marketingLabel,
      ].join(' ').toLocaleLowerCase('zh-CN')

      return searchableText.includes(query)
    })
  }, [products, search, statusFilter])
  const pagination = useTablePagination(filteredProducts, `${search}\u0000${statusFilter}`)

  function updateForm<Key extends keyof ProductFormState>(
    key: Key,
    value: ProductFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function openCreateSheet() {
    setForm(emptyFormState())
    setErrors({})
    setSheetOpen(true)
  }

  function openEditPage(product: MembershipProduct) {
    void navigate({
      to: '/membership-config/$resourceType/$recordId',
      params: { resourceType: 'products', recordId: product.id },
    })
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setErrors({})
    }
  }

  function handleTypeChange(type: MembershipProductType) {
    setForm((current) => ({
      ...current,
      type,
      renewalPrice: type === 'one-time' ? '0' : current.renewalPrice,
    }))
    setErrors((current) => ({ ...current, renewalPrice: undefined }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateForm(form)

    if (!result.input) {
      setErrors(result.errors)
      return
    }

    onCreate(result.input)
    toast.success('会员商品已新增')

    setSheetOpen(false)
    setErrors({})
  }

  function handleToggle(product: MembershipProduct) {
    onToggle(product.id)
    toast.success(product.status === 'enabled' ? '会员商品已下架' : '会员商品已上架')
  }

  function handleMove(product: MembershipProduct, direction: MoveDirection) {
    onMove(product.id, direction)
    toast.success(direction === 'up' ? '会员商品已上移' : '会员商品已下移')
  }

  function movementTitle(isBoundary: boolean) {
    if (hasActiveFilters) {
      return '请先清除筛选条件再调整排序'
    }
    return isBoundary ? '已到排序边界' : undefined
  }

  return (
    <section aria-label="会员商品管理">
      <Card>
        <CardHeader>
          <CardTitle>会员商品</CardTitle>
          <CardDescription>管理小程序会员购买方案，共 {products.length} 个商品。</CardDescription>
          <CardAction>
            <Button onClick={openCreateSheet}>
              <PlusIcon data-icon="inline-start" />
              新增会员商品
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="商品状态">
              <ListFilterOptionGroup
                ariaLabel="按商品状态筛选"
                options={statusFilterOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)}
                counts={countListFilterValues(products, (product) => product.status)}
                hideAllCount
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={search} onValueChange={setSearch} placeholder="搜索商品名称、类型或营销标签" ariaLabel="搜索会员商品" />
            </ListFilterRow>
          </ListFilters>

          <Table
            containerClassName="rounded-lg border"
            className="min-w-max"
          >
        <TableHeader>
          <TableRow>
            <TableHead>商品名称</TableHead>
            <TableHead>商品类型</TableHead>
            <TableHead>销售价</TableHead>
            <TableHead>原价</TableHead>
            <TableHead>续费价</TableHead>
            <TableHead>有效期</TableHead>
            <TableHead>营销标签</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>排序</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-24 text-center text-muted-foreground"
              >
                暂无符合条件的会员商品
              </TableCell>
            </TableRow>
          ) : pagination.pageItems.map((product) => {
            const productIndex = products.findIndex((item) => item.id === product.id)
            const isFirst = productIndex === 0
            const isLast = productIndex === products.length - 1

            return (
              <TableRow
                key={product.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                onClick={() => openEditPage(product)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openEditPage(product)
                }}
              >
                <TableCell>
                  <div className="flex min-w-48 items-center gap-3">
                    <button
                      type="button"
                      className="size-12 shrink-0 overflow-hidden rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`查看${product.name}大图`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setPreviewProduct(product)
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <img src={product.imageUrl} alt="" className="size-full object-cover" />
                    </button>
                    <span className="font-medium">{product.name}</span>
                  </div>
                </TableCell>
                <TableCell>{productTypeLabel(product.type)}</TableCell>
                <TableCell>{currencyFormatter.format(product.salePrice)}</TableCell>
                <TableCell>{currencyFormatter.format(product.originalPrice)}</TableCell>
                <TableCell>
                  {product.type === 'one-time'
                    ? '—'
                    : currencyFormatter.format(product.renewalPrice)}
                </TableCell>
                <TableCell>{product.durationDays} 天</TableCell>
                <TableCell>
                  {product.marketingLabel
                    ? <Badge variant="secondary">{product.marketingLabel}</Badge>
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === 'enabled' ? 'default' : 'destructive'}>
                    {product.status === 'enabled' ? '在售' : '已下架'}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{product.sortOrder}</TableCell>
                <TableCell
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${product.name}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEditPage(product)}><PencilIcon />编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(product)}><PowerIcon />{product.status === 'enabled' ? '下架' : '设为在售'}</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isFirst} title={movementTitle(isFirst)} onClick={() => handleMove(product, 'up')}><ArrowUpIcon />上移</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isLast} title={movementTitle(isLast)} onClick={() => handleMove(product, 'down')}><ArrowDownIcon />下移</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(product)}><Trash2Icon />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
          </Table>
          <TablePagination total={filteredProducts.length} unit="个商品" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>新增会员商品</SheetTitle>
            <SheetDescription>
              配置商品的基础信息、价格周期及小程序营销展示内容。
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-1 flex-col gap-6 px-4" onSubmit={handleSubmit}>
            <section className="flex flex-col gap-4" aria-labelledby="product-basic-heading">
              <h3 id="product-basic-heading" className="font-medium">基础信息</h3>
              <FieldGroup>
                <SingleProductImageField
                  id="membership-product-image"
                  value={form.imageUrl}
                  error={errors.imageUrl}
                  onChange={(value) => updateForm('imageUrl', value)}
                />
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="membership-product-name">商品名称</FieldLabel>
                  <Input
                    id="membership-product-name"
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    placeholder="例如：连续包月"
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="membership-product-type">商品类型</FieldLabel>
                  <Select
                    items={productTypeOptions}
                    value={form.type}
                    onValueChange={(value) => handleTypeChange(value as MembershipProductType)}
                  >
                    <SelectTrigger id="membership-product-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {productTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="membership-product-enabled">商品在售</FieldLabel>
                  <Switch
                    id="membership-product-enabled"
                    checked={form.enabled}
                    onCheckedChange={(checked) => updateForm('enabled', checked)}
                  />
                </Field>
              </FieldGroup>
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="product-price-heading">
              <h3 id="product-price-heading" className="font-medium">价格与周期</h3>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.salePrice)}>
                  <FieldLabel htmlFor="membership-product-sale-price">销售价（元）</FieldLabel>
                  <Input
                    id="membership-product-sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.salePrice}
                    onChange={(event) => updateForm('salePrice', event.target.value)}
                    aria-invalid={Boolean(errors.salePrice)}
                  />
                  <FieldError>{errors.salePrice}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.originalPrice)}>
                  <FieldLabel htmlFor="membership-product-original-price">原价（元）</FieldLabel>
                  <Input
                    id="membership-product-original-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.originalPrice}
                    onChange={(event) => updateForm('originalPrice', event.target.value)}
                    aria-invalid={Boolean(errors.originalPrice)}
                  />
                  <FieldError>{errors.originalPrice}</FieldError>
                </Field>
                <Field
                  data-invalid={Boolean(errors.renewalPrice)}
                  data-disabled={form.type === 'one-time'}
                >
                  <FieldLabel htmlFor="membership-product-renewal-price">续费价（元）</FieldLabel>
                  <Input
                    id="membership-product-renewal-price"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.renewalPrice}
                    onChange={(event) => updateForm('renewalPrice', event.target.value)}
                    disabled={form.type === 'one-time'}
                    aria-invalid={Boolean(errors.renewalPrice)}
                  />
                  <FieldError>{errors.renewalPrice}</FieldError>
                </Field>
                <Field data-invalid={Boolean(errors.durationDays)}>
                  <FieldLabel htmlFor="membership-product-duration">有效期（天）</FieldLabel>
                  <Input
                    id="membership-product-duration"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={form.durationDays}
                    onChange={(event) => updateForm('durationDays', event.target.value)}
                    aria-invalid={Boolean(errors.durationDays)}
                  />
                  <FieldError>{errors.durationDays}</FieldError>
                </Field>
              </FieldGroup>
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="product-marketing-heading">
              <h3 id="product-marketing-heading" className="font-medium">营销展示</h3>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="membership-product-marketing-label">
                    营销标签
                  </FieldLabel>
                  <Input
                    id="membership-product-marketing-label"
                    value={form.marketingLabel}
                    onChange={(event) => updateForm('marketingLabel', event.target.value)}
                    placeholder="例如：首月特惠"
                  />
                </Field>
              </FieldGroup>
            </section>

            <SheetFooter className="px-0">
              <Button type="submit">
                新增商品
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSheetOpenChange(false)}
              >
                取消
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(previewProduct)} onOpenChange={(open) => {
        if (!open) setPreviewProduct(undefined)
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{previewProduct?.name ?? '商品图片'}</DialogTitle></DialogHeader>
          {previewProduct ? (
            <img src={previewProduct.imageUrl} alt={previewProduct.name} className="max-h-[70dvh] w-full rounded-lg object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
