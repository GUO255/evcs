import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import type {
  StoredValueBalanceValidity,
  StoredValueRefundPolicy,
  StoredValueSettings,
} from './stored-value-config-types'

interface SettingsForm {
  enabled: boolean
  allowCustomAmount: boolean
  minimumAmount: string
  maximumAmount: string
  balanceValidity: StoredValueBalanceValidity
  refundPolicy: StoredValueRefundPolicy
  customerNotice: string
}

interface StoredValueSettingsCardProps {
  settings: StoredValueSettings
  onSave: (settings: StoredValueSettings) => void
}

const balanceValidityLabels: Readonly<Record<StoredValueBalanceValidity, string>> = {
  permanent: '长期有效',
  'one-year': '到账后 1 年',
  'two-years': '到账后 2 年',
}

const refundPolicyLabels: Readonly<Record<StoredValueRefundPolicy, string>> = {
  'principal-only': '仅退未消费本金',
  'unused-balance': '退还全部未消费余额',
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function parseYuanToCents(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) return undefined
  const [yuan = '0', fraction = ''] = normalized.split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : undefined
}

function settingsToForm(settings: StoredValueSettings): SettingsForm {
  return {
    enabled: settings.enabled,
    allowCustomAmount: settings.allowCustomAmount,
    minimumAmount: centsToInput(settings.minimumAmountCents),
    maximumAmount: centsToInput(settings.maximumAmountCents),
    balanceValidity: settings.balanceValidity,
    refundPolicy: settings.refundPolicy,
    customerNotice: settings.customerNotice,
  }
}

export function StoredValueSettingsCard({
  settings,
  onSave,
}: StoredValueSettingsCardProps) {
  const [form, setForm] = useState<SettingsForm>(() => settingsToForm(settings))
  const [errors, setErrors] = useState<Partial<Record<'minimumAmount' | 'maximumAmount' | 'customerNotice', string>>>({})

  function updateForm<Key extends keyof SettingsForm>(key: Key, value: SettingsForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function saveSettings() {
    const minimumAmountCents = parseYuanToCents(form.minimumAmount)
    const maximumAmountCents = parseYuanToCents(form.maximumAmount)
    const nextErrors: typeof errors = {}

    if (form.allowCustomAmount && (!minimumAmountCents || minimumAmountCents < 100)) {
      nextErrors.minimumAmount = '最低储值金额不能低于 1 元'
    }
    if (form.allowCustomAmount && (!maximumAmountCents || maximumAmountCents < 100)) {
      nextErrors.maximumAmount = '请输入有效的最高储值金额'
    } else if (
      form.allowCustomAmount
      && minimumAmountCents
      && maximumAmountCents
      && maximumAmountCents < minimumAmountCents
    ) {
      nextErrors.maximumAmount = '最高储值金额不能低于最低储值金额'
    }
    if (!form.customerNotice.trim()) {
      nextErrors.customerNotice = '请输入用户须知'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSave({
      enabled: form.enabled,
      allowCustomAmount: form.allowCustomAmount,
      minimumAmountCents: minimumAmountCents ?? settings.minimumAmountCents,
      maximumAmountCents: maximumAmountCents ?? settings.maximumAmountCents,
      balanceValidity: form.balanceValidity,
      refundPolicy: form.refundPolicy,
      customerNotice: form.customerNotice.trim(),
    })
    toast.success('储值基础配置已保存')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>基础配置</CardTitle>
        <CardDescription>控制小程序储值入口、自定义金额及余额使用规则。</CardDescription>
        <CardAction>
          <Button onClick={saveSettings}>保存配置</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-5 lg:grid-cols-2">
          <Field orientation="horizontal" className="rounded-lg border p-4">
            <div className="flex flex-1 flex-col gap-1">
              <FieldLabel htmlFor="stored-value-enabled">启用储值功能</FieldLabel>
              <FieldDescription>关闭后，小程序将隐藏储值入口。</FieldDescription>
            </div>
            <Switch
              id="stored-value-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => updateForm('enabled', checked)}
            />
          </Field>
          <Field orientation="horizontal" className="rounded-lg border p-4">
            <div className="flex flex-1 flex-col gap-1">
              <FieldLabel htmlFor="stored-value-custom-amount">允许自定义金额</FieldLabel>
              <FieldDescription>用户可在推荐档位外填写储值金额。</FieldDescription>
            </div>
            <Switch
              id="stored-value-custom-amount"
              checked={form.allowCustomAmount}
              onCheckedChange={(checked) => updateForm('allowCustomAmount', checked)}
            />
          </Field>
          <Field data-invalid={Boolean(errors.minimumAmount)}>
            <FieldLabel htmlFor="stored-value-minimum">最低储值金额（元）</FieldLabel>
            <Input
              id="stored-value-minimum"
              inputMode="decimal"
              disabled={!form.allowCustomAmount}
              value={form.minimumAmount}
              onChange={(event) => updateForm('minimumAmount', event.target.value)}
              aria-invalid={Boolean(errors.minimumAmount)}
              aria-describedby={errors.minimumAmount ? 'stored-value-minimum-error' : undefined}
            />
            <FieldError id="stored-value-minimum-error">{errors.minimumAmount}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.maximumAmount)}>
            <FieldLabel htmlFor="stored-value-maximum">最高储值金额（元）</FieldLabel>
            <Input
              id="stored-value-maximum"
              inputMode="decimal"
              disabled={!form.allowCustomAmount}
              value={form.maximumAmount}
              onChange={(event) => updateForm('maximumAmount', event.target.value)}
              aria-invalid={Boolean(errors.maximumAmount)}
              aria-describedby={errors.maximumAmount ? 'stored-value-maximum-error' : undefined}
            />
            <FieldError id="stored-value-maximum-error">{errors.maximumAmount}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="stored-value-validity">余额有效期</FieldLabel>
            <Select
              value={form.balanceValidity}
              onValueChange={(value) => updateForm('balanceValidity', value as StoredValueBalanceValidity)}
            >
              <SelectTrigger id="stored-value-validity" className="w-full">
                <SelectValue>
                  {(value: StoredValueBalanceValidity) => balanceValidityLabels[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">{balanceValidityLabels.permanent}</SelectItem>
                <SelectItem value="one-year">{balanceValidityLabels['one-year']}</SelectItem>
                <SelectItem value="two-years">{balanceValidityLabels['two-years']}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="stored-value-refund-policy">退款规则</FieldLabel>
            <Select
              value={form.refundPolicy}
              onValueChange={(value) => updateForm('refundPolicy', value as StoredValueRefundPolicy)}
            >
              <SelectTrigger id="stored-value-refund-policy" className="w-full">
                <SelectValue>
                  {(value: StoredValueRefundPolicy) => refundPolicyLabels[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal-only">{refundPolicyLabels['principal-only']}</SelectItem>
                <SelectItem value="unused-balance">{refundPolicyLabels['unused-balance']}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="lg:col-span-2" data-invalid={Boolean(errors.customerNotice)}>
            <FieldLabel htmlFor="stored-value-notice">用户须知</FieldLabel>
            <Textarea
              id="stored-value-notice"
              rows={3}
              value={form.customerNotice}
              onChange={(event) => updateForm('customerNotice', event.target.value)}
              aria-invalid={Boolean(errors.customerNotice)}
              aria-describedby={errors.customerNotice ? 'stored-value-notice-error' : undefined}
            />
            <FieldError id="stored-value-notice-error">{errors.customerNotice}</FieldError>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
