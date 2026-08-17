import { useState } from 'react'
import { PlusIcon, Trash2Icon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  pricingModeOptions,
  validateRateTemplateInput,
  type PricingMode,
  type RatePeriod,
  type RateTemplate,
  type RateTemplateInput,
  type RateTemplateValidationErrors,
} from './rate-data'
import {
  createRateTemplate,
  updateRateTemplate,
  useRates,
} from './rate-store'

export function RateTemplateForm({
  template,
  cancelAction,
  onSaved,
}: {
  template?: RateTemplate
  cancelAction: React.ReactNode
  onSaved: () => void
}) {
  const templates = useRates()
  const [input, setInput] = useState<RateTemplateInput>(() =>
    template ? templateToInput(template) : createEmptyInput())
  const [errors, setErrors] = useState<RateTemplateValidationErrors>({})

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = validateRateTemplateInput(input, templates, template?.id)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (template) {
      updateRateTemplate(template.id, input)
      toast.success('费率模板已保存')
    } else {
      createRateTemplate(input)
      toast.success('费率模板已创建')
    }
    onSaved()
  }

  function changeMode(pricingMode: PricingMode) {
    setInput((current) => pricingMode === 'fixed'
      ? { ...current, pricingMode, fixedElectricityPrice: 0.68, fixedServiceFee: 0.32, periods: [] }
      : { ...current, pricingMode, fixedElectricityPrice: null, fixedServiceFee: null, periods: createDefaultPeriods() })
    setErrors({})
  }

  function updatePeriod(id: string, values: Partial<RatePeriod>) {
    setInput((current) => ({
      ...current,
      periods: current.periods.map((period) =>
        period.id === id ? { ...period, ...values } : period),
    }))
  }

  function addPeriod() {
    setInput((current) => {
      const startTime = current.periods.at(-1)?.endTime ?? '00:00'
      return {
        ...current,
        periods: [
          ...current.periods,
          {
            id: crypto.randomUUID(),
            startTime,
            endTime: '24:00',
            electricityPrice: 0.6,
            serviceFee: 0.35,
          },
        ],
      }
    })
  }

  return (
    <form className="flex min-h-0 flex-col gap-6" onSubmit={submit} noValidate>
      <FieldSet>
        <FieldLegend>模板信息</FieldLegend>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2" data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="rate-template-name">模板名称 *</FieldLabel>
            <Input id="rate-template-name" value={input.name} onChange={(event) => setInput((current) => ({ ...current, name: event.target.value }))} aria-invalid={Boolean(errors.name)} />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="rate-pricing-mode">电价类型 *</FieldLabel>
            <Select items={pricingModeOptions} value={input.pricingMode} onValueChange={(value) => changeMode(value as PricingMode)}>
              <SelectTrigger id="rate-pricing-mode" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{pricingModeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="rate-remark">备注</FieldLabel>
            <Textarea id="rate-remark" rows={2} value={input.remark} onChange={(event) => setInput((current) => ({ ...current, remark: event.target.value }))} />
          </Field>
        </FieldGroup>
      </FieldSet>

      {input.pricingMode === 'fixed' ? (
        <FieldSet>
          <FieldLegend>全天费率</FieldLegend>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <MoneyField id="fixed-electricity-price" label="电价（元/度）*" value={input.fixedElectricityPrice} error={errors.fixedElectricityPrice} onChange={(value) => setInput((current) => ({ ...current, fixedElectricityPrice: value }))} />
            <MoneyField id="fixed-service-fee" label="服务费（元/度）*" value={input.fixedServiceFee} error={errors.fixedServiceFee} onChange={(value) => setInput((current) => ({ ...current, fixedServiceFee: value }))} />
          </FieldGroup>
        </FieldSet>
      ) : (
        <FieldSet>
          <div className="flex items-center justify-between gap-3">
            <FieldLegend>分时费率</FieldLegend>
            <Button type="button" variant="outline" size="sm" onClick={addPeriod}><PlusIcon data-icon="inline-start" />添加时段</Button>
          </div>
          <FieldGroup>
            {input.periods.map((period, index) => (
              <Field key={period.id} data-invalid={Boolean(errors.periods)}>
                <div className="grid items-end gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <Field><FieldLabel htmlFor={`${period.id}-start`}>开始时间</FieldLabel><Input id={`${period.id}-start`} value={period.startTime} onChange={(event) => updatePeriod(period.id, { startTime: event.target.value })} placeholder="00:00" /></Field>
                  <Field><FieldLabel htmlFor={`${period.id}-end`}>结束时间</FieldLabel><Input id={`${period.id}-end`} value={period.endTime} onChange={(event) => updatePeriod(period.id, { endTime: event.target.value })} placeholder="24:00" /></Field>
                  <Field><FieldLabel htmlFor={`${period.id}-electricity`}>电价（元/度）</FieldLabel><Input id={`${period.id}-electricity`} type="number" min="0" step="0.0001" value={period.electricityPrice} onChange={(event) => updatePeriod(period.id, { electricityPrice: event.target.valueAsNumber })} /></Field>
                  <Field><FieldLabel htmlFor={`${period.id}-service`}>服务费（元/度）</FieldLabel><Input id={`${period.id}-service`} type="number" min="0" step="0.0001" value={period.serviceFee} onChange={(event) => updatePeriod(period.id, { serviceFee: event.target.valueAsNumber })} /></Field>
                  <Button type="button" variant="ghost" size="icon" aria-label={`删除第 ${index + 1} 个时段`} onClick={() => setInput((current) => ({ ...current, periods: current.periods.filter((item) => item.id !== period.id) }))}><Trash2Icon /></Button>
                </div>
              </Field>
            ))}
            <FieldError>{errors.periods}</FieldError>
          </FieldGroup>
        </FieldSet>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        {cancelAction}
        <Button type="submit">{template ? '保存修改' : '创建模板'}</Button>
      </div>
    </form>
  )
}

function MoneyField({ id, label, value, error, onChange }: {
  id: string
  label: string
  value: number | null
  error?: string
  onChange: (value: number) => void
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type="number" min="0" step="0.0001" value={value ?? ''} onChange={(event) => onChange(event.target.valueAsNumber)} aria-invalid={Boolean(error)} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function createDefaultPeriods(): RatePeriod[] {
  return [
    { id: crypto.randomUUID(), startTime: '00:00', endTime: '08:00', electricityPrice: 0.32, serviceFee: 0.35 },
    { id: crypto.randomUUID(), startTime: '08:00', endTime: '22:00', electricityPrice: 0.72, serviceFee: 0.4 },
    { id: crypto.randomUUID(), startTime: '22:00', endTime: '24:00', electricityPrice: 0.32, serviceFee: 0.35 },
  ]
}

function createEmptyInput(): RateTemplateInput {
  return {
    name: '',
    pricingMode: 'fixed',
    fixedElectricityPrice: 0.68,
    fixedServiceFee: 0.32,
    periods: [],
    remark: '',
  }
}

function templateToInput(template: RateTemplate): RateTemplateInput {
  return {
    name: template.name,
    pricingMode: template.pricingMode,
    fixedElectricityPrice: template.fixedElectricityPrice,
    fixedServiceFee: template.fixedServiceFee,
    periods: template.periods.map((period) => ({ ...period })),
    remark: template.remark,
  }
}
