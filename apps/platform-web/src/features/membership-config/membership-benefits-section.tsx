import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Clock3Icon,
  HeadsetIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  TicketsIcon,
  Trash2Icon,
  WalletCardsIcon,
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
import { Textarea } from '@/components/ui/textarea'

import type {
  MembershipBenefit,
  MembershipBenefitIcon,
  MembershipBenefitInput,
  MembershipRecordStatus,
} from './membership-config-types'

type StatusFilter = MembershipRecordStatus | 'all'
type MoveDirection = 'up' | 'down'

interface MembershipBenefitsSectionProps {
  benefits: readonly MembershipBenefit[]
  onCreate: (input: MembershipBenefitInput) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: MoveDirection) => void
  onDelete: (benefit: MembershipBenefit) => void
}

interface BenefitFormState {
  name: string
  icon: MembershipBenefitIcon
  summary: string
  description: string
  enabled: boolean
}

type BenefitFormErrors = Partial<Record<
  'name' | 'summary' | 'description',
  string
>>

const benefitIcons: Record<
  MembershipBenefitIcon,
  typeof WalletCardsIcon
> = {
  wallet: WalletCardsIcon,
  ticket: TicketsIcon,
  clock: Clock3Icon,
  headset: HeadsetIcon,
}

const benefitIconOptions = [
  { label: '钱包卡片', value: 'wallet', icon: WalletCardsIcon },
  { label: '优惠券', value: 'ticket', icon: TicketsIcon },
  { label: '时钟', value: 'clock', icon: Clock3Icon },
  { label: '客服耳机', value: 'headset', icon: HeadsetIcon },
] as const satisfies readonly {
  label: string
  value: MembershipBenefitIcon
  icon: typeof WalletCardsIcon
}[]

const statusFilterOptions = [
  { label: '全部状态', value: 'all' },
  { label: '已启用', value: 'enabled' },
  { label: '已停用', value: 'disabled' },
] as const satisfies readonly { label: string; value: StatusFilter }[]

function emptyFormState(): BenefitFormState {
  return {
    name: '',
    icon: 'wallet',
    summary: '',
    description: '',
    enabled: true,
  }
}

function validateForm(values: BenefitFormState) {
  const errors: BenefitFormErrors = {}

  if (!values.name.trim()) {
    errors.name = '请输入权益名称'
  }

  if (!values.summary.trim()) {
    errors.summary = '请输入权益摘要'
  }

  if (!values.description.trim()) {
    errors.description = '请输入权益说明'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const input: MembershipBenefitInput = {
    name: values.name.trim(),
    icon: values.icon,
    summary: values.summary.trim(),
    description: values.description.trim(),
    status: values.enabled ? 'enabled' : 'disabled',
  }

  return { errors, input }
}

export function MembershipBenefitsSection({
  benefits,
  onCreate,
  onToggle,
  onMove,
  onDelete,
}: MembershipBenefitsSectionProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<BenefitFormState>(emptyFormState)
  const [errors, setErrors] = useState<BenefitFormErrors>({})

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all'
  const filteredBenefits = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-CN')

    return benefits.filter((benefit) => {
      if (statusFilter !== 'all' && benefit.status !== statusFilter) {
        return false
      }

      if (!query) {
        return true
      }

      return [
        benefit.name,
        benefit.summary,
        benefit.description,
      ].join(' ').toLocaleLowerCase('zh-CN').includes(query)
    })
  }, [benefits, search, statusFilter])
  const pagination = useTablePagination(filteredBenefits, `${search}\u0000${statusFilter}`)

  const PreviewIcon = benefitIcons[form.icon]

  function updateForm<Key extends keyof BenefitFormState>(
    key: Key,
    value: BenefitFormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function openCreateSheet() {
    setForm(emptyFormState())
    setErrors({})
    setSheetOpen(true)
  }

  function openEditPage(benefit: MembershipBenefit) {
    void navigate({
      to: '/membership-config/$resourceType/$recordId',
      params: { resourceType: 'benefits', recordId: benefit.id },
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
    toast.success('会员权益已新增')

    setSheetOpen(false)
    setErrors({})
  }

  function handleToggle(benefit: MembershipBenefit) {
    onToggle(benefit.id)
    toast.success(benefit.status === 'enabled' ? '会员权益已停用' : '会员权益已启用')
  }

  function handleMove(benefit: MembershipBenefit, direction: MoveDirection) {
    onMove(benefit.id, direction)
    toast.success(direction === 'up' ? '会员权益已上移' : '会员权益已下移')
  }

  function movementTitle(isBoundary: boolean) {
    if (hasActiveFilters) {
      return '请先清除筛选条件再调整排序'
    }
    return isBoundary ? '已到排序边界' : undefined
  }

  return (
    <section aria-label="会员权益管理">
      <Card>
        <CardHeader>
          <CardTitle>会员权益</CardTitle>
          <CardDescription>管理会员中心展示的权益内容，共 {benefits.length} 项权益。</CardDescription>
          <CardAction>
            <Button onClick={openCreateSheet}>
              <PlusIcon data-icon="inline-start" />
              新增会员权益
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="权益状态">
              <ListFilterOptionGroup
                ariaLabel="按权益状态筛选"
                options={statusFilterOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)}
                counts={countListFilterValues(benefits, (benefit) => benefit.status)}
                hideAllCount
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={search} onValueChange={setSearch} placeholder="搜索权益名称、摘要或说明" ariaLabel="搜索会员权益" />
            </ListFilterRow>
          </ListFilters>

          <Table containerClassName="rounded-lg border" className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>图标</TableHead>
            <TableHead>权益名称</TableHead>
            <TableHead>摘要</TableHead>
            <TableHead>说明</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>排序</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBenefits.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                暂无符合条件的会员权益
              </TableCell>
            </TableRow>
          ) : pagination.pageItems.map((benefit) => {
            const BenefitIcon = benefitIcons[benefit.icon]
            const benefitIndex = benefits.findIndex((item) => item.id === benefit.id)
            const isFirst = benefitIndex === 0
            const isLast = benefitIndex === benefits.length - 1

            return (
              <TableRow
                key={benefit.id}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                tabIndex={0}
                onClick={() => openEditPage(benefit)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openEditPage(benefit)
                }}
              >
                <TableCell>
                  <BenefitIcon aria-hidden="true" />
                </TableCell>
                <TableCell className="font-medium">{benefit.name}</TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  {benefit.summary}
                </TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  {benefit.description}
                </TableCell>
                <TableCell>
                  <Badge variant={benefit.status === 'enabled' ? 'default' : 'destructive'}>
                    {benefit.status === 'enabled' ? '已启用' : '已停用'}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">{benefit.sortOrder}</TableCell>
                <TableCell
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${benefit.name}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openEditPage(benefit)}><PencilIcon />编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(benefit)}><PowerIcon />{benefit.status === 'enabled' ? '停用' : '启用'}</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isFirst} title={movementTitle(isFirst)} onClick={() => handleMove(benefit, 'up')}><ArrowUpIcon />上移</DropdownMenuItem>
                        <DropdownMenuItem disabled={hasActiveFilters || isLast} title={movementTitle(isLast)} onClick={() => handleMove(benefit, 'down')}><ArrowDownIcon />下移</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(benefit)}><Trash2Icon />删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
          </Table>
          <TablePagination total={filteredBenefits.length} unit="项权益" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>新增会员权益</SheetTitle>
            <SheetDescription>
              配置权益的小程序展示名称、图标与说明内容。
            </SheetDescription>
          </SheetHeader>

          <form className="flex flex-1 flex-col gap-6 px-4" onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="membership-benefit-name">权益名称</FieldLabel>
                <Input
                  id="membership-benefit-name"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  placeholder="例如：会员专享价"
                />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="membership-benefit-icon">权益图标</FieldLabel>
                <Select
                  items={benefitIconOptions}
                  value={form.icon}
                  onValueChange={(value) =>
                    updateForm('icon', value as MembershipBenefitIcon)}
                >
                  <SelectTrigger id="membership-benefit-icon" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {benefitIconOptions.map((option) => {
                        const OptionIcon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <OptionIcon />
                            {option.label}
                          </SelectItem>
                        )
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={Boolean(errors.summary)}>
                <FieldLabel htmlFor="membership-benefit-summary">权益摘要</FieldLabel>
                <Input
                  id="membership-benefit-summary"
                  value={form.summary}
                  onChange={(event) => updateForm('summary', event.target.value)}
                  aria-invalid={Boolean(errors.summary)}
                  placeholder="例如：会员充电享专属价格"
                />
                <FieldError>{errors.summary}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.description)}>
                <FieldLabel htmlFor="membership-benefit-description">权益说明</FieldLabel>
                <Textarea
                  id="membership-benefit-description"
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  aria-invalid={Boolean(errors.description)}
                  placeholder="说明权益的具体内容与使用范围"
                />
                <FieldError>{errors.description}</FieldError>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="membership-benefit-enabled">启用权益</FieldLabel>
                <Switch
                  id="membership-benefit-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => updateForm('enabled', checked)}
                />
              </Field>
            </FieldGroup>

            <Card size="sm">
              <CardHeader>
                <CardTitle>实时预览</CardTitle>
                <CardDescription>小程序权益卡片展示效果</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <PreviewIcon aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {form.name || '权益名称'}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {form.summary || '权益摘要'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SheetFooter className="px-0">
              <Button type="submit">
                新增权益
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
