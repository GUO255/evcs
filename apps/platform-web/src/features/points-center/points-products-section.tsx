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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'

import {
  formatPoints,
  formatRmbFromCents,
  pointsProductStatusFilterOptions,
  pointsProductTypeLabels,
  pointsProductTypeOptions,
} from './points-center-data'
import type {
  PointsProduct,
  PointsProductInput,
  PointsProductStatus,
  PointsProductType,
} from './points-center-types'

type ProductTypeFilter = PointsProductType | 'all'
type ProductStatusFilter = PointsProductStatus | 'all'
type MoveDirection = 'up' | 'down'

interface PointsProductsSectionProps {
  products: readonly PointsProduct[]
  onCreate: (input: PointsProductInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (product: PointsProduct) => void
}

interface PointsProductFormState {
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

type PointsProductFormErrors = Partial<Record<
  | 'name'
  | 'imageUrl'
  | 'pointsCost'
  | 'referenceValue'
  | 'stock'
  | 'perUserLimit'
  | 'description',
  string
>>

const integerPattern = /^\d+$/
const nonnegativeDecimalPattern = /^\d+(?:\.\d{1,2})?$/
const formErrorIds = {
  name: 'points-product-name-error',
  pointsCost: 'points-product-points-cost-error',
  referenceValue: 'points-product-reference-value-error',
  stock: 'points-product-stock-error',
  perUserLimit: 'points-product-per-user-limit-error',
  description: 'points-product-description-error',
} as const

function emptyFormState(): PointsProductFormState {
  return {
    imageUrl: '',
    name: '',
    type: 'virtual',
    pointsCost: '',
    referenceValue: '',
    stock: '',
    perUserLimit: '',
    description: '',
    status: 'enabled',
  }
}

function decimalStringToCents(value: string) {
  const [wholePart, decimalPart = ''] = value.split('.')
  return Number(`${wholePart}${decimalPart.padEnd(2, '0')}`)
}

function validateForm(values: PointsProductFormState) {
  const errors: PointsProductFormErrors = {}
  const pointsCostValue = values.pointsCost.trim()
  const referenceValueValue = values.referenceValue.trim()
  const stockValue = values.stock.trim()
  const perUserLimitValue = values.perUserLimit.trim()
  const pointsCost = Number(pointsCostValue)
  const stock = Number(stockValue)
  const perUserLimit = Number(perUserLimitValue)
  let referenceValueInCents = 0

  if (!values.imageUrl) {
    errors.imageUrl = '请上传商品图片'
  }

  if (!values.name.trim()) {
    errors.name = '请输入商品名称'
  }

  if (!integerPattern.test(pointsCostValue) || pointsCost <= 0) {
    errors.pointsCost = '兑换积分必须为正整数'
  } else if (!Number.isSafeInteger(pointsCost)) {
    errors.pointsCost = '兑换积分超出可安全处理的整数范围'
  }

  if (!nonnegativeDecimalPattern.test(referenceValueValue)) {
    errors.referenceValue = '参考价值必须为非负数，且最多保留两位小数'
  } else {
    referenceValueInCents = decimalStringToCents(referenceValueValue)
    if (!Number.isSafeInteger(referenceValueInCents)) {
      errors.referenceValue = '参考价值超出可安全处理的金额范围'
    }
  }

  if (!integerPattern.test(stockValue)) {
    errors.stock = '库存必须为非负整数'
  } else if (!Number.isSafeInteger(stock)) {
    errors.stock = '库存超出可安全处理的整数范围'
  }

  if (!integerPattern.test(perUserLimitValue) || perUserLimit <= 0) {
    errors.perUserLimit = '每人限兑必须为正整数'
  } else if (!Number.isSafeInteger(perUserLimit)) {
    errors.perUserLimit = '每人限兑超出可安全处理的整数范围'
  }

  if (!values.description.trim()) {
    errors.description = '请输入商品说明'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const input: PointsProductInput = {
    imageUrl: values.imageUrl,
    name: values.name.trim(),
    type: values.type,
    pointsCost,
    referenceValueCents: referenceValueInCents,
    stock,
    perUserLimit,
    description: values.description.trim(),
    status: values.status,
  }

  return { errors, input }
}

export function PointsProductsSection({
  products,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: PointsProductsSectionProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ProductTypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<PointsProduct>()
  const [form, setForm] = useState<PointsProductFormState>(emptyFormState)
  const [errors, setErrors] = useState<PointsProductFormErrors>({})

  const hasActiveFilters = query.trim() !== ''
    || typeFilter !== 'all'
    || statusFilter !== 'all'

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')

    return products.filter((product) => {
      const matchesKeyword = !keyword || [product.name, product.description]
        .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
      const matchesType = typeFilter === 'all' || product.type === typeFilter
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter

      return matchesKeyword && matchesType && matchesStatus
    })
  }, [products, query, statusFilter, typeFilter])
  const pagination = useTablePagination(
    filteredProducts,
    `${query}\u0000${typeFilter}\u0000${statusFilter}`,
  )

  const productIndexById = useMemo(
    () => new Map(products.map((product, index) => [product.id, index])),
    [products],
  )

  function updateForm<Key extends keyof PointsProductFormState>(
    key: Key,
    value: PointsProductFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function resetForm() {
    setForm(emptyFormState())
    setErrors({})
  }

  function openCreateSheet() {
    resetForm()
    setSheetOpen(true)
  }

  function openEditPage(product: PointsProduct) {
    void navigate({
      to: '/points-center/$productId',
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
    const result = validateForm(form)

    if (!result.input) {
      setErrors(result.errors)
      return
    }

    onCreate(result.input)
    toast.success('积分兑换商品已新增')

    handleSheetOpenChange(false)
  }

  function handleToggle(product: PointsProduct) {
    onToggle(product.id)
    toast.success(product.status === 'enabled'
      ? '积分兑换商品已下架'
      : '积分兑换商品已上架')
  }

  function handleMove(product: PointsProduct, direction: MoveDirection) {
    onMove(product.id, direction)
    toast.success(direction === 'up'
      ? '积分兑换商品已上移'
      : '积分兑换商品已下移')
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
        <CardTitle>积分兑换商品</CardTitle>
        <CardDescription>管理积分兑换商品，共 {products.length} 个。</CardDescription>
        <CardAction>
          <Button onClick={openCreateSheet}>
            <PlusIcon data-icon="inline-start" />
            新增兑换商品
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="商品类型">
            <ListFilterOptionGroup
              ariaLabel="按商品类型筛选"
              options={[{ value: 'all', label: '全部' }, ...pointsProductTypeOptions]}
              counts={countListFilterValues(products, (product) => product.type)}
              hideAllCount
              value={typeFilter}
              onValueChange={setTypeFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="商品状态">
            <ListFilterOptionGroup
              ariaLabel="按商品状态筛选"
              options={pointsProductStatusFilterOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)}
              counts={countListFilterValues(products, (product) => product.status)}
              hideAllCount
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索商品名称或说明" ariaLabel="搜索积分兑换商品" />
          </ListFilterRow>
        </ListFilters>

        <Table containerClassName="rounded-lg border" className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>商品信息</TableHead>
              <TableHead>商品类型</TableHead>
              <TableHead>兑换积分</TableHead>
              <TableHead>参考价值</TableHead>
              <TableHead>库存</TableHead>
              <TableHead>每人限兑</TableHead>
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
                  暂无符合条件的积分兑换商品
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
                        <img src={product.imageUrl} alt="" className="size-full object-cover" />
                      </button>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium">{product.name}</span>
                        <span className="whitespace-normal text-xs text-muted-foreground">
                          {product.description}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{pointsProductTypeLabels[product.type]}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPoints(product.pointsCost)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatRmbFromCents(product.referenceValueCents)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatPoints(product.stock)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatPoints(product.perUserLimit)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'enabled' ? 'default' : 'destructive'}>
                      {product.status === 'enabled' ? '上架' : '已下架'}
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
                          <DropdownMenuItem onClick={() => handleToggle(product)}><PowerIcon />{product.status === 'enabled' ? '下架' : '上架'}</DropdownMenuItem>
                          <DropdownMenuItem disabled={upDisabled} title={movementTitle(isFirst)} onClick={() => handleMove(product, 'up')}><ArrowUpIcon />上移</DropdownMenuItem>
                          <DropdownMenuItem disabled={downDisabled} title={movementTitle(isLast)} onClick={() => handleMove(product, 'down')}><ArrowDownIcon />下移</DropdownMenuItem>
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

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              新增积分兑换商品
            </SheetTitle>
            <SheetDescription>
              配置小程序积分兑换商品的展示信息与兑换条件。
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex flex-1 flex-col gap-6 px-4"
            noValidate
            onSubmit={handleSubmit}
          >
            <FieldGroup>
              <SingleProductImageField
                id="points-product-image"
                value={form.imageUrl}
                error={errors.imageUrl}
                onChange={(value) => updateForm('imageUrl', value)}
              />
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="points-product-name">商品名称</FieldLabel>
                <Input
                  id="points-product-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? formErrorIds.name : undefined}
                  placeholder="例如：5 元充电优惠券"
                />
                <FieldError id={formErrorIds.name}>{errors.name}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="points-product-type">商品类型</FieldLabel>
                <Select
                  items={pointsProductTypeOptions}
                  value={form.type}
                  onValueChange={(value) =>
                    updateForm('type', value as PointsProductType)}
                >
                  <SelectTrigger id="points-product-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {pointsProductTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={Boolean(errors.pointsCost)}>
                <FieldLabel htmlFor="points-product-points-cost">兑换积分</FieldLabel>
                <Input
                  id="points-product-points-cost"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.pointsCost}
                  onChange={(event) => updateForm('pointsCost', event.target.value)}
                  aria-invalid={Boolean(errors.pointsCost)}
                  aria-describedby={errors.pointsCost
                    ? formErrorIds.pointsCost
                    : undefined}
                />
                <FieldError id={formErrorIds.pointsCost}>
                  {errors.pointsCost}
                </FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.referenceValue)}>
                <FieldLabel htmlFor="points-product-reference-value">
                  参考价值（元）
                </FieldLabel>
                <Input
                  id="points-product-reference-value"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.referenceValue}
                  onChange={(event) => updateForm('referenceValue', event.target.value)}
                  aria-invalid={Boolean(errors.referenceValue)}
                  aria-describedby={errors.referenceValue
                    ? formErrorIds.referenceValue
                    : undefined}
                />
                <FieldError id={formErrorIds.referenceValue}>
                  {errors.referenceValue}
                </FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.stock)}>
                <FieldLabel htmlFor="points-product-stock">库存</FieldLabel>
                <Input
                  id="points-product-stock"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(event) => updateForm('stock', event.target.value)}
                  aria-invalid={Boolean(errors.stock)}
                  aria-describedby={errors.stock ? formErrorIds.stock : undefined}
                />
                <FieldError id={formErrorIds.stock}>{errors.stock}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.perUserLimit)}>
                <FieldLabel htmlFor="points-product-per-user-limit">每人限兑</FieldLabel>
                <Input
                  id="points-product-per-user-limit"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.perUserLimit}
                  onChange={(event) => updateForm('perUserLimit', event.target.value)}
                  aria-invalid={Boolean(errors.perUserLimit)}
                  aria-describedby={errors.perUserLimit
                    ? formErrorIds.perUserLimit
                    : undefined}
                />
                <FieldError id={formErrorIds.perUserLimit}>
                  {errors.perUserLimit}
                </FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="points-product-description">商品说明</FieldLabel>
                <Textarea
                  id="points-product-description"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description
                    ? formErrorIds.description
                    : undefined}
                  placeholder="请输入小程序展示的商品说明"
                />
                <FieldError id={formErrorIds.description}>
                  {errors.description}
                </FieldError>
              </Field>

              <Field orientation="horizontal">
                <FieldLabel htmlFor="points-product-enabled">上架状态</FieldLabel>
                <Switch
                  id="points-product-enabled"
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

      <Dialog open={Boolean(previewProduct)} onOpenChange={(open) => {
        if (!open) setPreviewProduct(undefined)
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{previewProduct?.name ?? '商品图片'}</DialogTitle></DialogHeader>
          {previewProduct ? <img src={previewProduct.imageUrl} alt={previewProduct.name} className="max-h-[70dvh] w-full rounded-lg object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
