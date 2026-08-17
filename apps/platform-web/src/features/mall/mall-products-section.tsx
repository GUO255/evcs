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

import {
  ListFilterOptionGroup,
  ListFilterRow,
  ListFilters,
  ListSearchField,
} from '@/components/list-filters'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'

import {
  formatMallCurrency,
  mallProductCategoryFilterOptions,
  mallProductCategoryLabels,
  mallProductKindFilterOptions,
  mallProductKindLabels,
  mallProductStatusFilterOptions,
  mallProductStatusLabels,
} from './mall-data'
import type {
  MallProduct,
  MallProductCategory,
  MallProductInput,
  MallProductKind,
  MallProductStatus,
} from './mall-types'

type ProductKindFilter = MallProductKind | 'all'
type ProductCategoryFilter = MallProductCategory | 'all'
type ProductStatusFilter = MallProductStatus | 'all'
type MoveDirection = 'up' | 'down'

interface MallProductsSectionProps {
  products: readonly MallProduct[]
  onCreate: (input: MallProductInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (product: MallProduct) => void
}

interface MallProductFormState {
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

type MallProductFormErrors = Partial<Record<
  | 'sku'
  | 'imageUrl'
  | 'name'
  | 'price'
  | 'compareAtPrice'
  | 'stock'
  | 'description',
  string
>>

const integerFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
})
const integerPattern = /^\d+$/
const nonnegativeDecimalPattern = /^\d+(?:\.\d{1,2})?$/
const formErrorIds = {
  sku: 'mall-product-sku-error',
  name: 'mall-product-name-error',
  price: 'mall-product-price-error',
  compareAtPrice: 'mall-product-compare-at-price-error',
  stock: 'mall-product-stock-error',
  description: 'mall-product-description-error',
} as const
const reorderFilterReasonId = 'mall-product-reorder-filter-reason'

function emptyFormState(): MallProductFormState {
  return {
    imageUrl: '',
    sku: '',
    name: '',
    kind: 'physical',
    category: 'charging-accessory',
    price: '',
    compareAtPrice: '',
    stock: '',
    description: '',
    status: 'enabled',
  }
}

function decimalStringToCents(value: string) {
  const [wholePart, fractionPart = ''] = value.split('.')
  return Number(`${wholePart}${fractionPart.padEnd(2, '0')}`)
}

function validateForm(
  values: MallProductFormState,
  products: readonly MallProduct[],
) {
  const errors: MallProductFormErrors = {}
  const sku = values.sku.trim()
  const name = values.name.trim()
  const description = values.description.trim()
  const priceValue = values.price.trim()
  const compareAtPriceValue = values.compareAtPrice.trim()
  const stockValue = values.stock.trim()
  const normalizedSku = sku.toLocaleLowerCase('en-US')
  const stock = Number(stockValue)
  let priceCents = 0
  let compareAtPriceCents = 0

  if (!values.imageUrl) {
    errors.imageUrl = '请上传商品图片'
  }

  if (!sku) {
    errors.sku = '请输入商品 SKU'
  } else if (products.some((product) =>
    product.sku.trim().toLocaleLowerCase('en-US') === normalizedSku)) {
    errors.sku = '商品 SKU 已存在'
  }

  if (!name) {
    errors.name = '请输入商品名称'
  }

  if (!nonnegativeDecimalPattern.test(priceValue)) {
    errors.price = '销售价必须为非负数，且最多保留两位小数'
  } else {
    priceCents = decimalStringToCents(priceValue)
    if (!Number.isSafeInteger(priceCents)) {
      errors.price = '销售价超出可安全处理的金额范围'
    }
  }

  if (!nonnegativeDecimalPattern.test(compareAtPriceValue)) {
    errors.compareAtPrice = '划线价必须为非负数，且最多保留两位小数'
  } else {
    compareAtPriceCents = decimalStringToCents(compareAtPriceValue)
    if (!Number.isSafeInteger(compareAtPriceCents)) {
      errors.compareAtPrice = '划线价超出可安全处理的金额范围'
    }
  }

  if (
    !errors.price
    && !errors.compareAtPrice
    && compareAtPriceCents < priceCents
  ) {
    errors.compareAtPrice = '划线价不能低于销售价'
  }

  if (
    !integerPattern.test(stockValue)
    || !Number.isSafeInteger(stock)
    || stock < 0
  ) {
    errors.stock = '库存必须为安全范围内的非负整数'
  }

  if (!description) {
    errors.description = '请输入商品说明'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const input: MallProductInput = {
    imageUrl: values.imageUrl,
    sku,
    name,
    kind: values.kind,
    category: values.category,
    priceCents,
    compareAtPriceCents,
    stock,
    description,
    status: values.status,
  }

  return { errors, input }
}

export function MallProductsSection({
  products,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: MallProductsSectionProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<ProductKindFilter>('all')
  const [categoryFilter, setCategoryFilter] =
    useState<ProductCategoryFilter>('all')
  const [statusFilter, setStatusFilter] =
    useState<ProductStatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<MallProduct>()
  const [form, setForm] = useState<MallProductFormState>(emptyFormState)
  const [errors, setErrors] = useState<MallProductFormErrors>({})

  const hasActiveFilters = query.trim() !== ''
    || kindFilter !== 'all'
    || categoryFilter !== 'all'
    || statusFilter !== 'all'

  const filterOptionCounts = useMemo(() => {
    const kind: Record<ProductKindFilter, number> = {
      all: products.length,
      physical: 0,
      virtual: 0,
    }
    const category: Record<ProductCategoryFilter, number> = {
      all: products.length,
      'charging-accessory': 0,
      'vehicle-life': 0,
      coupon: 0,
    }
    const status: Record<ProductStatusFilter, number> = {
      all: products.length,
      enabled: 0,
      disabled: 0,
    }

    for (const product of products) {
      kind[product.kind] += 1
      category[product.category] += 1
      status[product.status] += 1
    }

    return { kind, category, status }
  }, [products])

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')

    return products.filter((product) => {
      const matchesKeyword = !keyword
        || [product.name, product.sku, product.description].some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(keyword),
        )
      const matchesKind =
        kindFilter === 'all' || product.kind === kindFilter
      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter
      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter

      return matchesKeyword
        && matchesKind
        && matchesCategory
        && matchesStatus
    })
  }, [categoryFilter, kindFilter, products, query, statusFilter])
  const pagination = useTablePagination(
    filteredProducts,
    `${query}\u0000${kindFilter}\u0000${categoryFilter}\u0000${statusFilter}`,
  )

  const productIndexById = useMemo(
    () => new Map(products.map((product, index) => [product.id, index])),
    [products],
  )

  function updateForm<Key extends keyof MallProductFormState>(
    key: Key,
    value: MallProductFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...((key === 'price' || key === 'compareAtPrice')
        ? { compareAtPrice: undefined }
        : {}),
    }))
  }

  function resetForm() {
    setForm(emptyFormState())
    setErrors({})
  }

  function openCreateSheet() {
    resetForm()
    setSheetOpen(true)
  }

  function openEditPage(product: MallProduct) {
    void navigate({
      to: '/mall/$productId',
      params: { productId: product.id },
    })
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      resetForm()
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateForm(form, products)

    if (!result.input) {
      setErrors(result.errors)
      return
    }

    onCreate(result.input)
    toast.success('商城商品已新增')

    handleSheetOpenChange(false)
  }

  function handleToggle(product: MallProduct) {
    onToggle(product.id)
    toast.success(product.status === 'enabled'
      ? '商城商品已下架'
      : '商城商品已设为在售')
  }

  function handleMove(product: MallProduct, direction: MoveDirection) {
    onMove(product.id, direction)
    toast.success(direction === 'up'
      ? '商城商品已上移'
      : '商城商品已下移')
  }

  function movementTitle(isBoundary: boolean) {
    if (hasActiveFilters) {
      return '请先清除筛选条件再调整排序'
    }

    return isBoundary ? '已到排序边界' : undefined
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>商城商品</CardTitle>
        <CardDescription>管理商城商品，共 {products.length} 个。</CardDescription>
        <CardAction>
          <Button onClick={openCreateSheet}>
            <PlusIcon data-icon="inline-start" />
            新增商品
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="商品类型">
            <ListFilterOptionGroup
              ariaLabel="按商品类型筛选"
              options={mallProductKindFilterOptions}
              counts={filterOptionCounts.kind}
              hideAllCount
              value={kindFilter}
              onValueChange={setKindFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="商品分类">
            <ListFilterOptionGroup
              ariaLabel="按商品分类筛选"
              options={mallProductCategoryFilterOptions}
              counts={filterOptionCounts.category}
              hideAllCount
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="商品状态">
            <ListFilterOptionGroup
              ariaLabel="按商品状态筛选"
              options={mallProductStatusFilterOptions}
              counts={filterOptionCounts.status}
              hideAllCount
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField
              value={query}
              onValueChange={setQuery}
              placeholder="搜索商品名称、SKU 或说明"
              ariaLabel="输入商城商品搜索关键词"
            />
          </ListFilterRow>
        </ListFilters>

        {hasActiveFilters ? (
          <p
            id={reorderFilterReasonId}
            className="-mt-2 text-xs text-muted-foreground sm:pl-24"
          >
            请先清除筛选条件再调整排序
          </p>
        ) : null}

        <Table containerClassName="rounded-lg border" className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>商品信息</TableHead>
              <TableHead>类型/分类</TableHead>
              <TableHead>销售价</TableHead>
              <TableHead>划线价</TableHead>
              <TableHead>库存</TableHead>
              <TableHead>销量</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>排序</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无符合条件的商城商品
                </TableCell>
              </TableRow>
            ) : pagination.pageItems.map((product) => {
              const productIndex = productIndexById.get(product.id)
              const isFirst = productIndex === 0
              const isLast = productIndex === products.length - 1
              const upDisabled = hasActiveFilters || isFirst
              const downDisabled = hasActiveFilters || isLast
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
                    <div className="flex min-w-72 max-w-96 items-center gap-3">
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
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-full object-cover transition-transform hover:scale-105"
                        />
                      </button>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium">{product.name}</span>
                        <span className="line-clamp-2 whitespace-normal text-xs text-muted-foreground">
                          {product.description}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{mallProductKindLabels[product.kind]}</span>
                      <span className="text-xs text-muted-foreground">
                        {mallProductCategoryLabels[product.category]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMallCurrency(product.priceCents)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMallCurrency(product.compareAtPriceCents)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {integerFormatter.format(product.stock)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {integerFormatter.format(product.salesCount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === 'enabled'
                        ? 'default'
                        : 'destructive'}
                    >
                      {mallProductStatusLabels[product.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {product.sortOrder}
                  </TableCell>
                  <TableCell
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={(
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`打开${product.name}操作菜单`}
                            />
                          )}
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEditPage(product)}>
                            <PencilIcon />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(product)}>
                            <PowerIcon />
                            {product.status === 'enabled' ? '下架' : '设为在售'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={upDisabled}
                            title={movementTitle(isFirst)}
                            onClick={() => handleMove(product, 'up')}
                          >
                            <ArrowUpIcon />
                            上移
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={downDisabled}
                            title={movementTitle(isLast)}
                            onClick={() => handleMove(product, 'down')}
                          >
                            <ArrowDownIcon />
                            下移
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(product)}
                          >
                            <Trash2Icon />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <TablePagination
          total={filteredProducts.length}
          unit="个商品"
          pageIndex={pagination.pageIndex}
          pageCount={pagination.pageCount}
          onPageChange={pagination.changePage}
        />
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              新增商城商品
            </SheetTitle>
            <SheetDescription>
              配置商城商品的展示信息、价格、库存与销售状态。
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex flex-1 flex-col gap-6 px-4"
            noValidate
            onSubmit={handleSubmit}
          >
            <FieldGroup>
              <SingleProductImageField
                id="mall-product-image"
                value={form.imageUrl}
                error={errors.imageUrl}
                onChange={(value) => updateForm('imageUrl', value)}
              />
              <Field data-invalid={Boolean(errors.sku)}>
                <FieldLabel htmlFor="mall-product-sku">商品 SKU</FieldLabel>
                <Input
                  id="mall-product-sku"
                  value={form.sku}
                  onChange={(event) => updateForm('sku', event.target.value)}
                  aria-invalid={Boolean(errors.sku)}
                  aria-describedby={errors.sku ? formErrorIds.sku : undefined}
                  placeholder="例如：MALL-3001"
                />
                <FieldError id={formErrorIds.sku}>{errors.sku}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="mall-product-name">商品名称</FieldLabel>
                <Input
                  id="mall-product-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? formErrorIds.name : undefined}
                  placeholder="请输入商城展示的商品名称"
                />
                <FieldError id={formErrorIds.name}>{errors.name}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="mall-product-kind">商品类型</FieldLabel>
                <Select
                  value={form.kind}
                  onValueChange={(value) =>
                    updateForm('kind', value as MallProductKind)}
                >
                  <SelectTrigger id="mall-product-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {mallProductKindFilterOptions
                        .filter((option) => option.value !== 'all')
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="mall-product-category">商品分类</FieldLabel>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    updateForm('category', value as MallProductCategory)}
                >
                  <SelectTrigger id="mall-product-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {mallProductCategoryFilterOptions
                        .filter((option) => option.value !== 'all')
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={Boolean(errors.price)}>
                <FieldLabel htmlFor="mall-product-price">销售价（元）</FieldLabel>
                <Input
                  id="mall-product-price"
                  type="text"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => updateForm('price', event.target.value)}
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price
                    ? formErrorIds.price
                    : undefined}
                  placeholder="例如：89.00"
                />
                <FieldError id={formErrorIds.price}>{errors.price}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.compareAtPrice)}>
                <FieldLabel htmlFor="mall-product-compare-at-price">
                  划线价（元）
                </FieldLabel>
                <Input
                  id="mall-product-compare-at-price"
                  type="text"
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  onChange={(event) =>
                    updateForm('compareAtPrice', event.target.value)}
                  aria-invalid={Boolean(errors.compareAtPrice)}
                  aria-describedby={errors.compareAtPrice
                    ? formErrorIds.compareAtPrice
                    : undefined}
                  placeholder="例如：129.00"
                />
                <FieldError id={formErrorIds.compareAtPrice}>
                  {errors.compareAtPrice}
                </FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.stock)}>
                <FieldLabel htmlFor="mall-product-stock">库存</FieldLabel>
                <Input
                  id="mall-product-stock"
                  type="text"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(event) => updateForm('stock', event.target.value)}
                  aria-invalid={Boolean(errors.stock)}
                  aria-describedby={errors.stock
                    ? formErrorIds.stock
                    : undefined}
                  placeholder="请输入非负整数"
                />
                <FieldError id={formErrorIds.stock}>{errors.stock}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="mall-product-description">商品说明</FieldLabel>
                <Textarea
                  id="mall-product-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm('description', event.target.value)}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description
                    ? formErrorIds.description
                    : undefined}
                  placeholder="请输入商城展示的商品说明"
                />
                <FieldError id={formErrorIds.description}>
                  {errors.description}
                </FieldError>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="mall-product-enabled">在售状态</FieldLabel>
                <Switch
                  id="mall-product-enabled"
                  checked={form.status === 'enabled'}
                  onCheckedChange={(checked) =>
                    updateForm('status', checked ? 'enabled' : 'disabled')}
                />
              </Field>
            </FieldGroup>

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

      <Dialog
        open={Boolean(previewProduct)}
        onOpenChange={(open) => {
          if (!open) setPreviewProduct(undefined)
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewProduct?.name ?? '商品图片'}</DialogTitle>
          </DialogHeader>
          {previewProduct ? (
            <div className="flex max-h-[75dvh] items-center justify-center overflow-hidden rounded-lg bg-muted">
              <img
                src={previewProduct.imageUrl}
                alt={previewProduct.name}
                className="max-h-[75dvh] max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
