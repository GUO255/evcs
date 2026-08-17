import { useEffect, useState } from 'react'

import { SingleProductImageField } from '@/components/single-product-image-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type {
  StoredValuePreset,
  StoredValuePresetInput,
} from './stored-value-config-types'

interface PresetForm {
  imageUrl: string
  name: string
  rechargeAmount: string
  bonusAmount: string
  marketingLabel: string
  enabled: boolean
}

interface StoredValuePresetDialogProps {
  open: boolean
  preset?: StoredValuePreset
  presets: readonly StoredValuePreset[]
  onOpenChange: (open: boolean) => void
  onSave: (input: StoredValuePresetInput) => void
}

type PresetFormErrors = Partial<Record<'imageUrl' | 'name' | 'rechargeAmount' | 'bonusAmount', string>>

function parseYuanToCents(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) return undefined
  const [yuan = '0', fraction = ''] = normalized.split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : undefined
}

function emptyForm(): PresetForm {
  return {
    imageUrl: '',
    name: '',
    rechargeAmount: '',
    bonusAmount: '0.00',
    marketingLabel: '',
    enabled: true,
  }
}

function presetToForm(preset: StoredValuePreset): PresetForm {
  return {
    imageUrl: preset.imageUrl,
    name: preset.name,
    rechargeAmount: (preset.rechargeAmountCents / 100).toFixed(2),
    bonusAmount: (preset.bonusAmountCents / 100).toFixed(2),
    marketingLabel: preset.marketingLabel,
    enabled: preset.status === 'enabled',
  }
}

export function StoredValuePresetDialog({
  open,
  preset,
  presets,
  onOpenChange,
  onSave,
}: StoredValuePresetDialogProps) {
  const [form, setForm] = useState<PresetForm>(emptyForm)
  const [errors, setErrors] = useState<PresetFormErrors>({})

  useEffect(() => {
    if (!open) return
    setForm(preset ? presetToForm(preset) : emptyForm())
    setErrors({})
  }, [open, preset])

  function updateForm<Key extends keyof PresetForm>(key: Key, value: PresetForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function submit() {
    const rechargeAmountCents = parseYuanToCents(form.rechargeAmount)
    const bonusAmountCents = parseYuanToCents(form.bonusAmount)
    const nextErrors: PresetFormErrors = {}

    if (!form.imageUrl) nextErrors.imageUrl = '请上传储值卡图片'
    if (!form.name.trim()) nextErrors.name = '请输入档位名称'
    if (!rechargeAmountCents || rechargeAmountCents < 100) {
      nextErrors.rechargeAmount = '充值金额不能低于 1 元'
    } else if (
      presets.some((candidate) =>
        candidate.id !== preset?.id
        && candidate.rechargeAmountCents === rechargeAmountCents,
      )
    ) {
      nextErrors.rechargeAmount = '该充值金额已存在'
    }
    if (bonusAmountCents === undefined) {
      nextErrors.bonusAmount = '赠送金额最多保留两位小数'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSave({
      imageUrl: form.imageUrl,
      name: form.name.trim(),
      rechargeAmountCents: rechargeAmountCents as number,
      bonusAmountCents: bonusAmountCents as number,
      marketingLabel: form.marketingLabel.trim(),
      status: form.enabled ? 'enabled' : 'disabled',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset ? '编辑储值档位' : '新增储值档位'}</DialogTitle>
          <DialogDescription>配置小程序展示的充值金额和赠送金额。</DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <SingleProductImageField
              id="stored-value-preset-image"
              value={form.imageUrl}
              error={errors.imageUrl}
              onChange={(value) => updateForm('imageUrl', value)}
            />
          </div>
          <Field className="sm:col-span-2" data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="stored-value-preset-name">档位名称 *</FieldLabel>
            <Input
              id="stored-value-preset-name"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="例如：畅充储值"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'stored-value-preset-name-error' : undefined}
            />
            <FieldError id="stored-value-preset-name-error">{errors.name}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.rechargeAmount)}>
            <FieldLabel htmlFor="stored-value-preset-amount">充值金额（元）*</FieldLabel>
            <Input
              id="stored-value-preset-amount"
              inputMode="decimal"
              value={form.rechargeAmount}
              onChange={(event) => updateForm('rechargeAmount', event.target.value)}
              placeholder="100.00"
              aria-invalid={Boolean(errors.rechargeAmount)}
              aria-describedby={errors.rechargeAmount ? 'stored-value-preset-amount-error' : undefined}
            />
            <FieldError id="stored-value-preset-amount-error">{errors.rechargeAmount}</FieldError>
          </Field>
          <Field data-invalid={Boolean(errors.bonusAmount)}>
            <FieldLabel htmlFor="stored-value-preset-bonus">赠送金额（元）*</FieldLabel>
            <Input
              id="stored-value-preset-bonus"
              inputMode="decimal"
              value={form.bonusAmount}
              onChange={(event) => updateForm('bonusAmount', event.target.value)}
              placeholder="5.00"
              aria-invalid={Boolean(errors.bonusAmount)}
              aria-describedby={errors.bonusAmount ? 'stored-value-preset-bonus-error' : undefined}
            />
            <FieldError id="stored-value-preset-bonus-error">{errors.bonusAmount}</FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="stored-value-preset-label">营销标签</FieldLabel>
            <Input
              id="stored-value-preset-label"
              value={form.marketingLabel}
              onChange={(event) => updateForm('marketingLabel', event.target.value)}
              placeholder="例如：推荐"
              maxLength={12}
            />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2 rounded-lg border p-4">
            <FieldLabel htmlFor="stored-value-preset-enabled" className="flex-1">立即启用</FieldLabel>
            <Switch
              id="stored-value-preset-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => updateForm('enabled', checked)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit}>{preset ? '保存修改' : '确认新增'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
