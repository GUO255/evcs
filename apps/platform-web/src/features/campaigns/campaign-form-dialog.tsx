import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'

import { SingleCampaignImageField } from '@/components/single-campaign-image-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  campaignToInput,
  campaignTypeOptions,
  createEmptyCampaignInput,
  normalizeCampaignInput,
  type Campaign,
  type CampaignInput,
  type CampaignType,
  validateCampaignInput,
} from './campaign-data'
import { useCampaigns } from './campaign-store'

interface CampaignFormDialogProps {
  open: boolean
  type: CampaignType
  campaign?: Campaign
  onOpenChange: (open: boolean) => void
}

export function CampaignFormDialog({ open, type, campaign, onOpenChange }: CampaignFormDialogProps) {
  const { createCampaign, updateCampaign } = useCampaigns()
  const editing = Boolean(campaign)
  const form = useForm({
    defaultValues: createEmptyCampaignInput(type),
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateCampaignInput(normalizeCampaignInput(value))
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => {
      const input = normalizeCampaignInput(value)
      if (campaign) updateCampaign(campaign.id, input)
      else createCampaign(input)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(campaign ? campaignToInput(campaign) : createEmptyCampaignInput(type))
  }, [campaign, form, open, type])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑活动' : '新增活动'}</DialogTitle>
          <DialogDescription>
            {editing ? '更新活动规则与执行周期，活动编号和状态不会改变。' : '填写活动规则，保存后生成草稿，可在列表中上架。'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          noValidate
        >
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-1 py-1">
            <FieldSet>
              <FieldLegend>活动信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="imageUrl">
                  {(field) => (
                    <div className="md:col-span-2">
                      <SingleCampaignImageField
                        id={field.name}
                        value={field.state.value}
                        error={getErrorMessage(field.state.meta.errors)}
                        onChange={field.handleChange}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="type">
                  {(field) => (
                    <Field data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor={field.name}>活动类型 *</FieldLabel>
                      <Select
                        items={campaignTypeOptions}
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value as CampaignType)}
                      >
                        <SelectTrigger id={field.name} className="w-full" aria-invalid={!field.state.meta.isValid}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {campaignTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                    </Field>
                  )}
                </form.Field>
                <form.Field name="name">
                  {(field) => <TextField field={field} label="活动名称 *" required />}
                </form.Field>
                <form.Field name="targetAudience">
                  {(field) => <TextField field={field} label="目标人群 *" required />}
                </form.Field>
                <form.Field name="budget">
                  {(field) => <TextField field={field} label="活动预算（元） *" type="number" min="0" step="0.01" required />}
                </form.Field>
                <form.Field name="ruleDescription">
                  {(field) => (
                    <Field className="md:col-span-2" data-invalid={!field.state.meta.isValid}>
                      <FieldLabel htmlFor={field.name}>活动规则 *</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        aria-invalid={!field.state.meta.isValid}
                        rows={3}
                        required
                      />
                      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>执行周期</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="startDate">
                  {(field) => <TextField field={field} label="开始日期 *" type="date" required />}
                </form.Field>
                <form.Field name="endDate">
                  {(field) => <TextField field={field} label="结束日期 *" type="date" min={form.getFieldValue('startDate') || undefined} required />}
                </form.Field>
                <form.Field name="description">
                  {(field) => (
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor={field.name}>活动说明</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        rows={3}
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </FieldSet>
          </div>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                <Button type="submit" disabled={isSubmitting}>{editing ? '保存修改' : '保存草稿'}</Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface StringFieldApi {
  name: string
  state: {
    value: string
    meta: { isValid: boolean, errors: unknown[] }
  }
  handleBlur: () => void
  handleChange: (value: string) => void
}

interface TextFieldProps {
  field: StringFieldApi
  label: string
  className?: string
  type?: React.ComponentProps<typeof Input>['type']
  min?: string
  step?: string
  required?: boolean
}

function TextField({ field, label, className, type, min, step, required }: TextFieldProps) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        min={min}
        step={step}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={invalid}
        required={required}
      />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

function getErrorMessage(errors: readonly unknown[]): string | undefined {
  const error = errors.find(Boolean)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}
