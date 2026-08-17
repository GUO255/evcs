import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Building2Icon, LinkIcon, UnlinkIcon } from '@/components/ui/icons'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useMerchants } from '@/features/contracted-merchants/merchant-store'

import type { ChargingStation, StationMerchantBinding } from './station-data'

interface StationMerchantBindingProps {
  station: ChargingStation
  onBindingsChange: (bindings: readonly StationMerchantBinding[]) => void
}

export function StationMerchantBindings({ station, onBindingsChange }: StationMerchantBindingProps) {
  const [bindOpen, setBindOpen] = useState(false)
  const [unbindOpen, setUnbindOpen] = useState(false)
  const currentBinding = station.merchantBindings.find((binding) => binding.status === 'active')

  if (!currentBinding) {
    return (
      <>
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2Icon /></EmptyMedia>
            <EmptyTitle>暂未绑定商户</EmptyTitle>
            <EmptyDescription>每个充电站只能同时绑定一个签约商户。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setBindOpen(true)}><LinkIcon data-icon="inline-start" />绑定商户</Button>
          </EmptyContent>
        </Empty>
        <BindMerchantDialog
          open={bindOpen}
          onOpenChange={setBindOpen}
          onSave={(binding) => {
            const inactiveBindings = station.merchantBindings.map((item) => item.status === 'active' ? { ...item, status: 'inactive' as const } : item)
            onBindingsChange([...inactiveBindings, binding])
            setBindOpen(false)
          }}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>绑定商户</CardTitle>
          <CardDescription>当前场站只能绑定一个签约商户。</CardDescription>
          <CardAction>
            <Button variant="outline" onClick={() => setUnbindOpen(true)}><UnlinkIcon data-icon="inline-start" />解绑</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="商户编号" value={currentBinding.merchantCode} />
            <DetailItem label="商户名称" value={currentBinding.merchantName} />
            <DetailItem label="绑定日期" value={currentBinding.boundAt} />
            <DetailItem label="绑定状态" value={<Badge>已绑定</Badge>} />
          </dl>
        </CardContent>
      </Card>

      <AlertDialog open={unbindOpen} onOpenChange={setUnbindOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><UnlinkIcon /></AlertDialogMedia>
            <AlertDialogTitle>解绑商户？</AlertDialogTitle>
            <AlertDialogDescription>将解除“{currentBinding.merchantName}”与当前充电站的绑定关系。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onBindingsChange(station.merchantBindings.map((binding) => binding.id === currentBinding.id ? { ...binding, status: 'inactive' } : binding))
                setUnbindOpen(false)
              }}
            >确认解绑</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface BindMerchantInput {
  merchantId: string
}

const emptyBindMerchantInput: BindMerchantInput = { merchantId: '' }

function BindMerchantDialog({ open, onOpenChange, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (binding: StationMerchantBinding) => void
}) {
  const { merchants } = useMerchants()
  const activeMerchants = useMemo(() => merchants.filter((merchant) => merchant.status === 'active'), [merchants])
  const merchantOptions = useMemo(() => activeMerchants.map((merchant) => ({ value: merchant.id, label: `${merchant.merchantCode} · ${merchant.companyName}` })), [activeMerchants])
  const form = useForm({
    defaultValues: emptyBindMerchantInput,
    validators: {
      onSubmit: ({ value }) => {
        const errors: Record<string, string> = {}
        if (!activeMerchants.some((merchant) => merchant.id === value.merchantId)) errors.merchantId = '请选择有效的签约商户'
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => {
      const merchant = activeMerchants.find((candidate) => candidate.id === value.merchantId)
      if (!merchant) return
      onSave({
        id: crypto.randomUUID(),
        merchantCode: merchant.merchantCode,
        merchantName: merchant.companyName,
        boundAt: new Date().toISOString().slice(0, 10),
        status: 'active',
      })
    },
  })

  useEffect(() => {
    if (open) form.reset(emptyBindMerchantInput)
  }, [form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>绑定商户</DialogTitle>
          <DialogDescription>选择一个合作中的签约商户与当前充电站建立绑定关系。</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
          noValidate
        >
          <FieldGroup>
            <form.Field name="merchantId">
              {(field) => {
                const invalid = !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>签约商户 *</FieldLabel>
                    <Select items={merchantOptions} value={field.state.value || null} onValueChange={(value) => field.handleChange(value ?? '')}>
                      <SelectTrigger id={field.name} className="w-full" aria-invalid={invalid}><SelectValue placeholder="选择签约商户" /></SelectTrigger>
                      <SelectContent><SelectGroup>{merchantOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">确认绑定</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
}

function getErrorMessage(errors: readonly unknown[]): string | undefined {
  const error = errors.find(Boolean)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return undefined
}
