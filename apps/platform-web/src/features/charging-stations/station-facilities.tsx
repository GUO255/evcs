import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import type { LucideIcon } from '@/components/ui/icons'
import {
  DoorOpenIcon,
  PencilIcon,
  ShowerHeadIcon,
  ShoppingBasketIcon,
  StoreIcon,
  Trash2Icon,
  UploadIcon,
  UtensilsIcon,
} from '@/components/ui/icons'

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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  facilityTypeOptions,
  type ChargingStation,
  type FacilityType,
  type StationFacility,
} from './station-data'

interface StationFacilitiesProps {
  station: ChargingStation
  onFacilitiesChange: (facilities: readonly StationFacility[]) => void
}

const facilityIcons: Record<FacilityType, LucideIcon> = {
  restaurant: UtensilsIcon,
  'convenience-store': StoreIcon,
  'vending-machine': ShoppingBasketIcon,
  restroom: DoorOpenIcon,
  shower: ShowerHeadIcon,
}

const facilityStatusOptions = [
  { value: 'available', label: '可用' },
  { value: 'unavailable', label: '暂停服务' },
] as const

export function StationFacilities({ station, onFacilitiesChange }: StationFacilitiesProps) {
  const [editingFacility, setEditingFacility] = useState<StationFacility | null>(null)

  if (station.facilities.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><StoreIcon /></EmptyMedia>
          <EmptyTitle>暂无配套设施</EmptyTitle>
          <EmptyDescription>该场站尚未录入配套服务设施。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilityTypeOptions.map((option) => {
          const facility = station.facilities.find((candidate) => candidate.type === option.value)
          const Icon = facilityIcons[option.value]
          return (
            <Card key={option.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                  {option.label}
                </CardTitle>
                <CardDescription>{facility ? facility.name : '暂未配置'}</CardDescription>
                {facility ? (
                  <CardAction>
                    <Button variant="ghost" size="icon-sm" aria-label={`编辑${facility.name}`} onClick={() => setEditingFacility(facility)}>
                      <PencilIcon />
                    </Button>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent>
                {facility ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                      {facility.images.map((image, index) => (
                        <img
                          key={`${image}-${index}`}
                          className="size-40 rounded-lg object-cover"
                          src={image}
                          alt={`${facility.name}图片 ${index + 1}`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                    <dl className="grid gap-3">
                      <DetailItem label="位置" value={facility.location} />
                      <DetailItem label="服务时间" value={facility.serviceHours} />
                      <DetailItem label="服务状态" value={<FacilityStatusBadge status={facility.status} />} />
                    </dl>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">当前场站未提供该项服务。</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <FacilityEditDialog
        facility={editingFacility}
        onOpenChange={(open) => { if (!open) setEditingFacility(null) }}
        onSave={(input) => {
          if (!editingFacility) return
          onFacilitiesChange(station.facilities.map((facility) => facility.id === editingFacility.id ? { ...facility, ...input } : facility))
          setEditingFacility(null)
        }}
      />
    </>
  )
}

type FacilityInput = Pick<StationFacility, 'name' | 'images' | 'location' | 'serviceHours' | 'status'>

function FacilityEditDialog({ facility, onOpenChange, onSave }: {
  facility: StationFacility | null
  onOpenChange: (open: boolean) => void
  onSave: (input: FacilityInput) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageToDelete, setImageToDelete] = useState<number | null>(null)
  const form = useForm({
    defaultValues: emptyFacilityInput,
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateFacilityInput(value)
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => onSave(normalizeFacilityInput(value)),
  })

  useEffect(() => {
    if (facility) form.reset(facilityToInput(facility))
    setImageToDelete(null)
  }, [facility, form])

  return (
    <Dialog open={Boolean(facility)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑配套设施</DialogTitle>
          <DialogDescription>{facility ? `${getFacilityTypeLabel(facility.type)} · ${facility.name}` : '更新配套设施资料。'}</DialogDescription>
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
          <form.Field name="images">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor="facility-images">设施图片 *</FieldLabel>
                <div className="flex flex-wrap gap-3">
                  {field.state.value.map((image, index) => (
                    <div key={`${image}-${index}`} className="relative">
                      <img className="size-32 rounded-lg object-cover" src={image} alt={`设施图片 ${index + 1}`} />
                      <Button
                        className="absolute right-2 top-2"
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        aria-label={`删除第 ${index + 1} 张设施图片`}
                        onClick={() => setImageToDelete(index)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="size-32 flex-col"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon />
                    上传图片
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  id="facility-images"
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    void appendImageFiles(event.target.files, field.state.value, field.handleChange)
                    event.target.value = ''
                  }}
                />
                <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                <AlertDialog
                  open={imageToDelete !== null}
                  onOpenChange={(open) => { if (!open) setImageToDelete(null) }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><Trash2Icon /></AlertDialogMedia>
                      <AlertDialogTitle>删除设施图片？</AlertDialogTitle>
                      <AlertDialogDescription>确认后将从设施图片中移除该图片，保存修改后生效。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                          if (imageToDelete !== null) {
                            field.handleChange(field.state.value.filter((_, index) => index !== imageToDelete))
                          }
                          setImageToDelete(null)
                        }}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Field>
            )}
          </form.Field>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <form.Field name="name">{(field) => <TextField field={field} label="设施名称 *" className="md:col-span-2" />}</form.Field>
            <form.Field name="location">{(field) => <TextField field={field} label="所在位置 *" />}</form.Field>
            <form.Field name="serviceHours">{(field) => <TextField field={field} label="服务时间 *" />}</form.Field>
            <form.Field name="status">
              {(field) => (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor={field.name}>服务状态 *</FieldLabel>
                  <Select items={facilityStatusOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as StationFacility['status'])}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{facilityStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">保存修改</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const emptyFacilityInput: FacilityInput = { name: '', images: [], location: '', serviceHours: '', status: 'available' }

interface StringFieldApi {
  name: string
  state: { value: string; meta: { isValid: boolean; errors: unknown[] } }
  handleBlur: () => void
  handleChange: (value: string) => void
}

function TextField({ field, label, className }: { field: StringFieldApi; label: string; className?: string }) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={invalid} />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

function validateFacilityInput(value: FacilityInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (value.images.length === 0) errors.images = '请至少上传一张设施图片'
  if (!value.name.trim()) errors.name = '请输入设施名称'
  if (!value.location.trim()) errors.location = '请输入所在位置'
  if (!value.serviceHours.trim()) errors.serviceHours = '请输入服务时间'
  return errors
}

function normalizeFacilityInput(value: FacilityInput): FacilityInput {
  return { ...value, images: [...value.images], name: value.name.trim(), location: value.location.trim(), serviceHours: value.serviceHours.trim() }
}

function facilityToInput(facility: StationFacility): FacilityInput {
  return { name: facility.name, images: [...facility.images], location: facility.location, serviceHours: facility.serviceHours, status: facility.status }
}

async function appendImageFiles(files: FileList | null, currentImages: readonly string[], onChange: (images: string[]) => void) {
  if (!files?.length) return
  const images = await Promise.all(Array.from(files).map(readImageFile))
  onChange([...currentImages, ...images])
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getFacilityTypeLabel(type: FacilityType): string {
  return facilityTypeOptions.find((option) => option.value === type)?.label ?? type
}

function FacilityStatusBadge({ status }: { status: StationFacility['status'] }) {
  return <Badge variant={status === 'available' ? 'default' : 'destructive'}>{status === 'available' ? '可用' : '暂停服务'}</Badge>
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
