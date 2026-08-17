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
  MembershipRecordStatus,
  MembershipStationPrice,
  MembershipStationPriceInput,
} from './membership-config-types'

type StatusFilter = MembershipRecordStatus | 'all'
type MoveDirection = 'up' | 'down'

interface MembershipPricesSectionProps {
  prices: readonly MembershipStationPrice[]
  onCreate: (input: MembershipStationPriceInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (price: MembershipStationPrice) => void
}

interface PriceFormState {
  city: string
  stationName: string
  originalPrice: string
  memberPrice: string
  enabled: boolean
}

type PriceFormErrors = Partial<Record<
  'city' | 'stationName' | 'originalPrice' | 'memberPrice',
  string
>>

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
] as const satisfies readonly { label: string; value: StatusFilter }[]

function emptyFormState(): PriceFormState {
  return {
    city: '',
    stationName: '',
    originalPrice: '',
    memberPrice: '',
    enabled: true,
  }
}

function formatEnergyPrice(price: number) {
  return `¥${price.toFixed(4)}/度`
}

function validateForm(values: PriceFormState) {
  const errors: PriceFormErrors = {}
  const originalPrice = Number(values.originalPrice)
  const memberPrice = Number(values.memberPrice)
  const originalPriceValid = (
    values.originalPrice.trim() !== ''
    && Number.isFinite(originalPrice)
    && originalPrice >= 0
  )
  const memberPriceValid = (
    values.memberPrice.trim() !== ''
    && Number.isFinite(memberPrice)
    && memberPrice >= 0
  )

  if (!values.city.trim()) {
    errors.city = '请输入城市'
  }

  if (!values.stationName.trim()) {
    errors.stationName = '请输入场站名称'
  }

  if (!originalPriceValid) {
    errors.originalPrice = '原价必须为非负数'
  }

  if (!memberPriceValid) {
    errors.memberPrice = '会员价必须为非负数'
  } else if (originalPriceValid && memberPrice >= originalPrice) {
    errors.memberPrice = '会员价必须低于原价'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const input: MembershipStationPriceInput = {
    city: values.city.trim(),
    stationName: values.stationName.trim(),
    originalPrice,
    memberPrice,
    status: values.enabled ? 'enabled' : 'disabled',
  }

  return { errors, input }
}

export function MembershipPricesSection({
  prices,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: MembershipPricesSectionProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<PriceFormState>(emptyFormState)
  const [errors, setErrors] = useState<PriceFormErrors>({})

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all'
  const filteredPrices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-CN')

    return prices.filter((price) => {
      if (statusFilter !== 'all' && price.status !== statusFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return [price.city, price.stationName]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(query)
    })
  }, [prices, search, statusFilter])
  const pagination = useTablePagination(filteredPrices, `${search}\u0000${statusFilter}`)
  const priceIndexes = useMemo(
    () => new Map(prices.map((price, index) => [price.id, index])),
    [prices],
  )

  const previewOriginalPrice = Number(form.originalPrice)
  const previewMemberPrice = Number(form.memberPrice)
  const hasValidPreview = (
    form.originalPrice.trim() !== ''
    && form.memberPrice.trim() !== ''
    && Number.isFinite(previewOriginalPrice)
    && Number.isFinite(previewMemberPrice)
    && previewOriginalPrice >= 0
    && previewMemberPrice >= 0
    && previewMemberPrice < previewOriginalPrice
  )

  function updateForm<Key extends keyof PriceFormState>(
    key: Key,
    value: PriceFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function openCreateSheet() {
    setForm(emptyFormState())
    setErrors({})
    setSheetOpen(true)
  }

  function openEditPage(price: MembershipStationPrice) {
    void navigate({
      to: '/membership-config/$resourceType/$recordId',
      params: { resourceType: 'prices', recordId: price.id },
    })
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setErrors({})
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
    toast.success('场站会员专享价已新增')

    setSheetOpen(false)
    setErrors({})
  }

  function handleToggle(price: MembershipStationPrice) {
    onToggle(price.id)
    toast.success(
      price.status === 'enabled'
        ? '场站会员专享价已停用'
        : '场站会员专享价已启用',
    )
  }

  function handleMove(price: MembershipStationPrice, direction: MoveDirection) {
    onMove(price.id, direction)
    toast.success(direction === 'up' ? '场站会员专享价已上移' : '场站会员专享价已下移')
  }

  function movementTitle(isBoundary: boolean) {
    if (hasActiveFilters) {
      return '请先清除筛选条件再调整排序'
    }
    return isBoundary ? '已到排序边界' : undefined
  }

  return (
    <section aria-label="场站会员专享价管理">
      <Card>
        <CardHeader>
          <CardTitle>专享价配置</CardTitle>
          <CardDescription>管理场站会员充电专享价，共 {prices.length} 个场站。</CardDescription>
          <CardAction>
            <Button onClick={openCreateSheet}>
              <PlusIcon data-icon="inline-start" />
              新增专享价
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="配置状态">
              <ListFilterOptionGroup
                ariaLabel="按专享价状态筛选"
                options={statusFilterOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)}
                counts={countListFilterValues(prices, (price) => price.status)}
                hideAllCount
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={search} onValueChange={setSearch} placeholder="搜索城市或场站名称" ariaLabel="搜索场站会员专享价" />
            </ListFilterRow>
          </ListFilters>

          <Table containerClassName="rounded-lg border" className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>城市</TableHead>
            <TableHead>场站</TableHead>
            <TableHead>原价</TableHead>
            <TableHead>会员价</TableHead>
            <TableHead>优惠金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>排序</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPrices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-24 text-center text-muted-foreground"
              >
                暂无符合条件的场站会员专享价
              </TableCell>
            </TableRow>
          ) : pagination.pageItems.map((price) => {
            const priceIndex = priceIndexes.get(price.id) ?? -1
            const isFirst = priceIndex === 0
            const isLast = priceIndex === prices.length - 1

            return (
              <TableRow
                key={price.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                onClick={() => openEditPage(price)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openEditPage(price)
                }}
              >
                <TableCell>{price.city}</TableCell>
                <TableCell className="font-medium">{price.stationName}</TableCell>
                <TableCell className="tabular-nums">
                  {formatEnergyPrice(price.originalPrice)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatEnergyPrice(price.memberPrice)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {Math.max(0, price.originalPrice - price.memberPrice).toFixed(4)}
                </TableCell>
                <TableCell>
                  <Badge variant={price.status === 'enabled' ? 'default' : 'destructive'}>
                    {price.status === 'enabled' ? '已启用' : '已停用'}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{price.sortOrder}</TableCell>
                <TableCell
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${price.stationName}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEditPage(price)}><PencilIcon />编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(price)}><PowerIcon />{price.status === 'enabled' ? '停用' : '启用'}</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isFirst} title={movementTitle(isFirst)} onClick={() => handleMove(price, 'up')}><ArrowUpIcon />上移</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isLast} title={movementTitle(isLast)} onClick={() => handleMove(price, 'down')}><ArrowDownIcon />下移</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(price)}><Trash2Icon />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
          </Table>
          <TablePagination total={filteredPrices.length} unit="个场站" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>新增场站会员专享价</SheetTitle>
            <SheetDescription>
              配置指定场站的充电原价与会员专享价格。
            </SheetDescription>
          </SheetHeader>

          <form
            className="flex flex-1 flex-col gap-6 px-4"
            noValidate
            onSubmit={handleSubmit}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(errors.city)}>
                <FieldLabel htmlFor="membership-price-city">城市</FieldLabel>
                <Input
                  id="membership-price-city"
                  value={form.city}
                  onChange={(event) => updateForm('city', event.target.value)}
                  aria-invalid={Boolean(errors.city)}
                  placeholder="例如：郑州市"
                />
                <FieldError>{errors.city}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.stationName)}>
                <FieldLabel htmlFor="membership-price-station-name">场站名称</FieldLabel>
                <Input
                  id="membership-price-station-name"
                  value={form.stationName}
                  onChange={(event) => updateForm('stationName', event.target.value)}
                  aria-invalid={Boolean(errors.stationName)}
                  placeholder="例如：郑州高新万达充电站"
                />
                <FieldError>{errors.stationName}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.originalPrice)}>
                <FieldLabel htmlFor="membership-price-original-price">
                  原价（元/度）
                </FieldLabel>
                <Input
                  id="membership-price-original-price"
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  value={form.originalPrice}
                  onChange={(event) => updateForm('originalPrice', event.target.value)}
                  aria-invalid={Boolean(errors.originalPrice)}
                  placeholder="例如：1.9200"
                />
                <FieldError>{errors.originalPrice}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.memberPrice)}>
                <FieldLabel htmlFor="membership-price-member-price">
                  会员价（元/度）
                </FieldLabel>
                <Input
                  id="membership-price-member-price"
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  value={form.memberPrice}
                  onChange={(event) => updateForm('memberPrice', event.target.value)}
                  aria-invalid={Boolean(errors.memberPrice)}
                  placeholder="例如：1.7440"
                />
                <FieldError>{errors.memberPrice}</FieldError>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="membership-price-enabled">启用专享价</FieldLabel>
                <Switch
                  id="membership-price-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => updateForm('enabled', checked)}
                />
              </Field>
            </FieldGroup>

            <Card size="sm">
              <CardHeader>
                <CardTitle>实时预览</CardTitle>
                <CardDescription>会员充电价格展示效果</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm" aria-live="polite">
                  {hasValidPreview
                    ? (
                        <>
                          原价 {formatEnergyPrice(previewOriginalPrice)} → 会员价{' '}
                          {formatEnergyPrice(previewMemberPrice)}，每度优惠 ¥
                          {Math.max(0, previewOriginalPrice - previewMemberPrice).toFixed(4)}
                        </>
                      )
                    : '输入有效的原价与会员价后显示预览'}
                </p>
              </CardContent>
            </Card>

            <SheetFooter className="px-0">
              <Button type="submit">
                新增专享价
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
    </section>
  )
}
