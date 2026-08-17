import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'

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
  customerFormValuesToInput,
  customerStatusOptions,
  customerToFormValues,
  customerTypeOptions,
  emptyCustomerFormValues,
  normalizeCustomerFormValues,
  type Customer,
  type CustomerFormValues,
  type CustomerStatus,
  type CustomerType,
  validateCustomerFormValues,
} from './customer-data'
import { useCustomers } from './customer-store'

interface CustomerFormDialogProps {
  open: boolean
  customer?: Customer
  onOpenChange: (open: boolean) => void
}

export function CustomerFormDialog({ open, customer, onOpenChange }: CustomerFormDialogProps) {
  const { customers, createCustomer, updateCustomer } = useCustomers()
  const editing = Boolean(customer)
  const form = useForm({
    defaultValues: emptyCustomerFormValues,
    validators: {
      onSubmit: ({ value }) => {
        const normalized = normalizeCustomerFormValues(value)
        const errors = validateCustomerFormValues(normalized, customers, customer?.id)
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => {
      const input = customerFormValuesToInput(normalizeCustomerFormValues(value))
      if (customer) updateCustomer(customer.id, input)
      else createCustomer(input)
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(customer ? customerToFormValues(customer) : emptyCustomerFormValues)
  }, [customer, form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑签约客户' : '新增签约客户'}</DialogTitle>
          <DialogDescription>
            {editing ? '更新客户资料，客户编号和创建时间不会改变。' : '填写客户、联系人和合同信息，保存后自动生成客户编号。'}
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
              <FieldLegend>客户信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="customerType">
                  {(field) => {
                    const invalid = !field.state.meta.isValid
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>客户类型 *</FieldLabel>
                        <Select items={customerTypeOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as CustomerType)}>
                          <SelectTrigger id={field.name} className="w-full" aria-invalid={invalid}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {customerTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="customerName">
                  {(field) => <TextField field={field} label="客户全称 *" required />}
                </form.Field>
                <form.Field name="shortName">
                  {(field) => <TextField field={field} label="客户简称 *" required />}
                </form.Field>
                <form.Field name="unifiedSocialCreditCode">
                  {(field) => <TextField field={field} label="统一社会信用代码 *" required />}
                </form.Field>
                <form.Field name="legalRepresentative">
                  {(field) => <TextField field={field} label="法定代表人 *" required />}
                </form.Field>
                <form.Field name="vehicleCount">
                  {(field) => <TextField field={field} label="车辆数" type="number" min="0" step="1" />}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>联系人信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="contactName">
                  {(field) => <TextField field={field} label="联系人 *" required />}
                </form.Field>
                <form.Field name="contactPhone">
                  {(field) => <TextField field={field} label="联系电话 *" required />}
                </form.Field>
                <form.Field name="contactEmail">
                  {(field) => <TextField field={field} label="联系邮箱" type="email" className="md:col-span-2" />}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>联系地址</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <form.Field name="province">
                  {(field) => <TextField field={field} label="省份" />}
                </form.Field>
                <form.Field name="city">
                  {(field) => <TextField field={field} label="城市" />}
                </form.Field>
                <form.Field name="district">
                  {(field) => <TextField field={field} label="区县" />}
                </form.Field>
                <form.Field name="address">
                  {(field) => <TextField field={field} label="详细地址 *" className="md:col-span-3" required />}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>合同信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="signedAt">
                  {(field) => <TextField field={field} label="签约日期 *" type="date" required />}
                </form.Field>
                <form.Field name="status">
                  {(field) => {
                    const invalid = !field.state.meta.isValid
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>客户状态 *</FieldLabel>
                        <Select items={customerStatusOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as CustomerStatus)}>
                          <SelectTrigger id={field.name} className="w-full" aria-invalid={invalid}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {customerStatusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                      </Field>
                    )
                  }}
                </form.Field>
                <form.Field name="contractStartAt">
                  {(field) => <TextField field={field} label="合同开始日期 *" type="date" required />}
                </form.Field>
                <form.Field name="contractEndAt">
                  {(field) => <TextField field={field} label="合同结束日期 *" type="date" min={form.getFieldValue('contractStartAt') || undefined} required />}
                </form.Field>
                <form.Field name="discountRate">
                  {(field) => <TextField field={field} label="折扣率（%） *" type="number" min="0" max="100" step="0.01" required />}
                </form.Field>
                <form.Field name="remark">
                  {(field) => (
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor={field.name}>备注</FieldLabel>
                      <Textarea id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} rows={3} />
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
                <Button type="submit" disabled={isSubmitting}>{editing ? '保存修改' : '新增客户'}</Button>
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
  max?: string
  step?: string
  required?: boolean
}

function TextField({ field, label, className, type, min, max, step, required }: TextFieldProps) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        min={min}
        max={max}
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
