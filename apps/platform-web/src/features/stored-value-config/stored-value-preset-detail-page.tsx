import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, WalletCardsIcon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { SingleProductImageField } from '@/components/single-product-image-field'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { updateStoredValuePreset, useStoredValueConfig } from './stored-value-config-store'

function parseYuanToCents(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) return undefined
  const [yuan = '0', fraction = ''] = normalized.split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : undefined
}

export function StoredValuePresetDetailPage({ presetId }: { presetId: string }) {
  const { presets } = useStoredValueConfig()
  const preset = presets.find((record) => record.id === presetId)
  const [form, setForm] = useState(() => ({
    imageUrl: preset?.imageUrl ?? '',
    name: preset?.name ?? '',
    rechargeAmount: preset ? (preset.rechargeAmountCents / 100).toFixed(2) : '',
    bonusAmount: preset ? (preset.bonusAmountCents / 100).toFixed(2) : '',
    marketingLabel: preset?.marketingLabel ?? '',
    enabled: preset?.status === 'enabled',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!preset) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><WalletCardsIcon /></EmptyMedia>
          <EmptyTitle>未找到该储值档位</EmptyTitle>
          <EmptyDescription>档位可能已被删除，或当前链接无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/stored-value-config" className={buttonVariants()}>返回储值配置</Link></EmptyContent>
      </Empty>
    )
  }

  function update<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const rechargeAmountCents = parseYuanToCents(form.rechargeAmount)
    const bonusAmountCents = parseYuanToCents(form.bonusAmount)
    const nextErrors: Record<string, string> = {}
    if (!form.imageUrl) nextErrors.imageUrl = '请上传储值卡图片'
    if (!form.name.trim()) nextErrors.name = '请输入档位名称'
    if (!rechargeAmountCents || rechargeAmountCents < 100) {
      nextErrors.rechargeAmount = '充值金额不能低于 1 元'
    } else if (presets.some((record) =>
      record.id !== presetId && record.rechargeAmountCents === rechargeAmountCents)) {
      nextErrors.rechargeAmount = '该充值金额已存在'
    }
    if (bonusAmountCents === undefined) nextErrors.bonusAmount = '赠送金额最多保留两位小数'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    updateStoredValuePreset(presetId, {
      imageUrl: form.imageUrl,
      name: form.name.trim(),
      rechargeAmountCents: rechargeAmountCents as number,
      bonusAmountCents: bonusAmountCents as number,
      marketingLabel: form.marketingLabel.trim(),
      status: form.enabled ? 'enabled' : 'disabled',
    })
    toast.success('储值档位已保存')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/stored-value-config" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回储值配置
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">编辑储值档位</h1>
          <Badge variant={preset.status === 'enabled' ? 'default' : 'destructive'}>
            {preset.status === 'enabled' ? '已启用' : '已停用'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{preset.name}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>档位信息</CardTitle>
          <CardDescription>修改储值卡展示、充值赠送规则和启用状态。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
            <FieldGroup className="grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <SingleProductImageField id="stored-value-detail-image" value={form.imageUrl} error={errors.imageUrl} onChange={(value) => update('imageUrl', value)} />
              </div>
              <FormInput id="stored-value-detail-name" label="档位名称" value={form.name} error={errors.name} onChange={(value) => update('name', value)} />
              <FormInput id="stored-value-detail-label" label="营销标签" value={form.marketingLabel} onChange={(value) => update('marketingLabel', value)} />
              <FormInput id="stored-value-detail-recharge" label="充值金额（元）" value={form.rechargeAmount} error={errors.rechargeAmount} inputMode="decimal" onChange={(value) => update('rechargeAmount', value)} />
              <FormInput id="stored-value-detail-bonus" label="赠送金额（元）" value={form.bonusAmount} error={errors.bonusAmount} inputMode="decimal" onChange={(value) => update('bonusAmount', value)} />
              <Field orientation="horizontal" className="lg:col-span-2 rounded-lg border p-4">
                <FieldLabel htmlFor="stored-value-detail-enabled" className="flex-1">启用状态</FieldLabel>
                <Switch id="stored-value-detail-enabled" checked={form.enabled} onCheckedChange={(value) => update('enabled', value)} />
              </Field>
            </FieldGroup>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Link to="/stored-value-config" className={buttonVariants({ variant: 'outline' })}>取消</Link>
              <Button type="submit">保存修改</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

function FormInput({ id, label, value, error, inputMode, onChange }: {
  id: string
  label: string
  value: string
  error?: string
  inputMode?: React.ComponentProps<typeof Input>['inputMode']
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}
