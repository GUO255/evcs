import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from '@/components/ui/icons'
import { toast } from 'sonner'

import { SingleCampaignImageField } from '@/components/single-campaign-image-field'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { CampaignActionDialog, type CampaignAction } from './campaign-action-dialog'
import {
  campaignToInput,
  canDeleteCampaign,
  canEditCampaign,
  canPublishCampaign,
  canTakeCampaignOffline,
  createEmptyCampaignInput,
  getCampaignTypeLabel,
  normalizeCampaignInput,
  validateCampaignInput,
} from './campaign-data'
import { CampaignStatusBadge } from './campaign-data-table'
import { useCampaigns } from './campaign-store'

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate()
  const {
    getCampaign,
    updateCampaign,
    deleteCampaign,
    publishCampaign,
    takeCampaignOffline,
  } = useCampaigns()
  const campaign = getCampaign(campaignId)
  const [action, setAction] = useState<CampaignAction>()
  const form = useForm({
    defaultValues: campaign ? campaignToInput(campaign) : createEmptyCampaignInput('stored-value'),
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateCampaignInput(normalizeCampaignInput(value))
        return Object.keys(errors).length ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => {
      if (!campaign || !canEditCampaign(campaign)) return
      updateCampaign(campaign.id, normalizeCampaignInput(value))
      toast.success('活动已保存')
    },
  })

  if (!campaign) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><MegaphoneIcon /></EmptyMedia>
          <EmptyTitle>未找到该活动</EmptyTitle>
          <EmptyDescription>活动可能已被删除，或当前链接中的活动 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/campaigns" className={buttonVariants()}>返回活动列表</Link></EmptyContent>
      </Empty>
    )
  }

  const editable = canEditCampaign(campaign)

  function confirmAction() {
    if (!campaign || !action) return
    if (action === 'publish') publishCampaign(campaign.id)
    if (action === 'offline') takeCampaignOffline(campaign.id)
    if (action === 'delete') {
      deleteCampaign(campaign.id)
      void navigate({ to: '/campaigns', replace: true })
    }
    setAction(undefined)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/campaigns" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回活动列表
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">编辑活动</h1>
              <Badge variant="secondary">{getCampaignTypeLabel(campaign.type)}</Badge>
              <CampaignStatusBadge campaign={campaign} />
            </div>
            <p className="text-sm text-muted-foreground">{campaign.name} · {campaign.campaignCode}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" aria-label="活动操作" />}>
              <MoreHorizontalIcon data-icon="inline-start" />
              更多操作
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {canTakeCampaignOffline(campaign) ? (
                <DropdownMenuItem onClick={() => setAction('offline')}><ArrowDownIcon />下架</DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled={!canPublishCampaign(campaign)} onClick={() => setAction('publish')}><ArrowUpIcon />上架</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={!canDeleteCampaign(campaign)} onClick={() => setAction('delete')}><Trash2Icon />删除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>活动信息</CardTitle>
          <CardDescription>
            {editable ? '修改活动展示、规则、目标人群和执行周期。' : '已上架活动需先下架后才能修改。'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
            noValidate
          >
            <FieldGroup className="grid gap-5 lg:grid-cols-2">
              <form.Field name="imageUrl">
                {(field) => (
                  <div className="lg:col-span-2">
                    <SingleCampaignImageField id="campaign-detail-image" value={field.state.value} error={getErrorMessage(field.state.meta.errors)} onChange={field.handleChange} disabled={!editable} />
                  </div>
                )}
              </form.Field>
              <form.Field name="name">{(field) => <TextField field={field} label="活动名称" disabled={!editable} className="lg:col-span-2" />}</form.Field>
              <form.Field name="targetAudience">{(field) => <TextField field={field} label="目标人群" disabled={!editable} />}</form.Field>
              <form.Field name="budget">{(field) => <TextField field={field} label="活动预算（元）" type="number" min="0" step="0.01" disabled={!editable} />}</form.Field>
              <form.Field name="startDate">{(field) => <TextField field={field} label="开始日期" type="date" disabled={!editable} />}</form.Field>
              <form.Field name="endDate">{(field) => <TextField field={field} label="结束日期" type="date" min={form.getFieldValue('startDate') || undefined} disabled={!editable} />}</form.Field>
              <form.Field name="ruleDescription">
                {(field) => (
                  <Field className="lg:col-span-2" data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>活动规则</FieldLabel>
                    <Textarea id={field.name} rows={4} value={field.state.value} disabled={!editable} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={!field.state.meta.isValid} />
                    <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                  </Field>
                )}
              </form.Field>
              <form.Field name="description">
                {(field) => (
                  <Field className="lg:col-span-2">
                    <FieldLabel htmlFor={field.name}>活动说明</FieldLabel>
                    <Textarea id={field.name} rows={4} value={field.state.value} disabled={!editable} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Link to="/campaigns" className={buttonVariants({ variant: 'outline' })}>取消</Link>
              <Button type="submit" disabled={!editable}>保存修改</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <CampaignActionDialog action={action} campaign={campaign} onOpenChange={(open) => {
        if (!open) setAction(undefined)
      }} onConfirm={confirmAction} />
    </section>
  )
}

interface StringFieldApi {
  name: string
  state: { value: string; meta: { isValid: boolean; errors: unknown[] } }
  handleBlur: () => void
  handleChange: (value: string) => void
}

function TextField({ field, label, className, type, min, step, disabled }: {
  field: StringFieldApi
  label: string
  className?: string
  type?: React.ComponentProps<typeof Input>['type']
  min?: string
  step?: string
  disabled?: boolean
}) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} type={type} min={min} step={step} value={field.state.value} disabled={disabled} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={invalid} />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

function getErrorMessage(errors: readonly unknown[]): string | undefined {
  const error = errors.find(Boolean)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return undefined
}
