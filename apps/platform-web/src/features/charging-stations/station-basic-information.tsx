import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  BatteryIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  PlugIcon,
  SunIcon,
  Trash2Icon,
  UploadIcon,
  ZapIcon,
  type LucideIcon,
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import type { ChargingStation } from './station-data'

interface StationBasicInformationProps {
  station: ChargingStation
  onSave: (station: ChargingStation) => void
}

type StationBasicInput = Pick<ChargingStation,
  | 'name'
  | 'province'
  | 'city'
  | 'district'
  | 'address'
  | 'longitude'
  | 'latitude'
  | 'serviceHours'
  | 'openedAt'
  | 'parkingSpaces'
  | 'dcChargerCount'
  | 'acChargerCount'
  | 'connectorCount'
  | 'solarCapacityKw'
  | 'storageCapacityKwh'
  | 'operatorName'
  | 'servicePhone'
  | 'images'
>

export function StationBasicInformation({ station, onSave }: StationBasicInformationProps) {
  const [editing, setEditing] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const form = useForm({
    defaultValues: stationToInput(station),
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateStationInput(value)
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => {
      onSave({ ...station, ...value, images: [...value.images] })
      setEditing(false)
    },
  })

  useEffect(() => {
    if (!editing) form.reset(stationToInput(station))
  }, [editing, form, station])

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <PencilIcon data-icon="inline-start" />
            编辑基本信息
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {station.images.map((image, index) => (
            <img
              key={`${image}-${index}`}
              className="size-40 rounded-lg object-cover"
              src={image}
              alt={`${station.name}场站图片 ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>场站资料</CardTitle>
              <CardDescription>场站位置、服务时间与运营主体。</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DefinitionItem label="场站编号" value={station.code} />
                <DefinitionItem label="投运日期" value={station.openedAt} icon={CalendarIcon} />
                <DefinitionItem label="服务时间" value={station.serviceHours} icon={ClockIcon} />
                <DefinitionItem label="客服电话" value={station.servicePhone} />
                <DefinitionItem label="运营主体" value={station.operatorName} wide />
                <DefinitionItem label="场站地址" value={`${station.province}${station.city}${station.district}${station.address}`} icon={MapPinIcon} wide />
                <DefinitionItem label="经纬度" value={`${station.longitude}, ${station.latitude}`} wide />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>场站规模</CardTitle>
              <CardDescription>停车资源及光储充设备规划容量。</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <DefinitionItem label="停车位" value={`${station.parkingSpaces} 个`} />
                <DefinitionItem label="直流充电桩" value={`${station.dcChargerCount} 台`} icon={ZapIcon} />
                <DefinitionItem label="交流充电桩" value={`${station.acChargerCount} 台`} icon={PlugIcon} />
                <DefinitionItem label="充电枪" value={`${station.connectorCount} 把`} />
                <DefinitionItem label="光伏装机容量" value={`${station.solarCapacityKw} kW`} icon={SunIcon} />
                <DefinitionItem label="储能容量" value={`${station.storageCapacityKwh} kWh`} icon={BatteryIcon} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>编辑基本信息</CardTitle>
          <CardDescription>更新场站资料、运营规模和展示图片。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <form.Field name="images">
            {(field) => (
              <FieldSet>
                <FieldLegend>场站图片</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="station-images" className="sr-only">上传场站图片</FieldLabel>
                    <div className="flex flex-wrap gap-3">
                      {field.state.value.map((image, index) => (
                        <div key={`${image}-${index}`} className="relative">
                          <img className="size-32 rounded-lg object-cover" src={image} alt={`场站图片 ${index + 1}`} />
                          <Button
                            className="absolute right-2 top-2"
                            type="button"
                            variant="secondary"
                            size="icon-sm"
                            aria-label={`删除第 ${index + 1} 张图片`}
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
                      id="station-images"
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
                  </Field>
                </FieldGroup>
                <AlertDialog
                  open={imageToDelete !== null}
                  onOpenChange={(open) => { if (!open) setImageToDelete(null) }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogMedia><Trash2Icon /></AlertDialogMedia>
                      <AlertDialogTitle>删除场站图片？</AlertDialogTitle>
                      <AlertDialogDescription>确认后将从场站图片中移除该图片，保存基本信息后生效。</AlertDialogDescription>
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
              </FieldSet>
            )}
          </form.Field>

          <FieldSet>
            <FieldLegend>场站资料</FieldLegend>
            <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="station-code">场站编号</FieldLabel>
                <Input id="station-code" value={station.code} disabled />
              </Field>
              <form.Field name="name">{(field) => <TextField field={field} label="场站名称 *" required />}</form.Field>
              <form.Field name="openedAt">{(field) => <TextField field={field} label="投运日期 *" type="date" required />}</form.Field>
              <form.Field name="serviceHours">{(field) => <TextField field={field} label="服务时间 *" required />}</form.Field>
              <form.Field name="servicePhone">{(field) => <TextField field={field} label="客服电话 *" required />}</form.Field>
              <form.Field name="operatorName">{(field) => <TextField field={field} label="运营主体 *" className="md:col-span-2 xl:col-span-3" required />}</form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>场站位置</FieldLegend>
            <FieldGroup className="grid gap-4 md:grid-cols-3">
              <form.Field name="province">{(field) => <TextField field={field} label="省份 *" required />}</form.Field>
              <form.Field name="city">{(field) => <TextField field={field} label="城市 *" required />}</form.Field>
              <form.Field name="district">{(field) => <TextField field={field} label="区县 *" required />}</form.Field>
              <form.Field name="address">{(field) => <TextField field={field} label="详细地址 *" className="md:col-span-3" required />}</form.Field>
              <form.Field name="longitude">{(field) => <NumberField field={field} label="经度" step="0.0001" />}</form.Field>
              <form.Field name="latitude">{(field) => <NumberField field={field} label="纬度" step="0.0001" />}</form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>场站规模</FieldLegend>
            <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <form.Field name="parkingSpaces">{(field) => <NumberField field={field} label="停车位（个）" />}</form.Field>
              <form.Field name="dcChargerCount">{(field) => <NumberField field={field} label="直流充电桩（台）" />}</form.Field>
              <form.Field name="acChargerCount">{(field) => <NumberField field={field} label="交流充电桩（台）" />}</form.Field>
              <form.Field name="connectorCount">{(field) => <NumberField field={field} label="充电枪（把）" />}</form.Field>
              <form.Field name="solarCapacityKw">{(field) => <NumberField field={field} label="光伏装机容量（kW）" />}</form.Field>
              <form.Field name="storageCapacityKwh">{(field) => <NumberField field={field} label="储能容量（kWh）" />}</form.Field>
            </FieldGroup>
          </FieldSet>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => {
            form.reset(stationToInput(station))
            setEditing(false)
          }}>取消</Button>
          <Button type="submit">保存修改</Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function stationToInput(station: ChargingStation): StationBasicInput {
  return {
    name: station.name,
    province: station.province,
    city: station.city,
    district: station.district,
    address: station.address,
    longitude: station.longitude,
    latitude: station.latitude,
    serviceHours: station.serviceHours,
    openedAt: station.openedAt,
    parkingSpaces: station.parkingSpaces,
    dcChargerCount: station.dcChargerCount,
    acChargerCount: station.acChargerCount,
    connectorCount: station.connectorCount,
    solarCapacityKw: station.solarCapacityKw,
    storageCapacityKwh: station.storageCapacityKwh,
    operatorName: station.operatorName,
    servicePhone: station.servicePhone,
    images: [...station.images],
  }
}

function validateStationInput(value: StationBasicInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const requiredFields: Array<[keyof StationBasicInput, string]> = [
    ['name', '请输入场站名称'], ['openedAt', '请选择投运日期'], ['serviceHours', '请输入服务时间'],
    ['servicePhone', '请输入客服电话'], ['operatorName', '请输入运营主体'], ['province', '请输入省份'],
    ['city', '请输入城市'], ['district', '请输入区县'], ['address', '请输入详细地址'],
  ]
  for (const [field, message] of requiredFields) {
    if (!String(value[field]).trim()) errors[field] = message
  }
  if (value.images.length === 0) errors.images = '请至少上传一张场站图片'
  return errors
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

interface StringFieldApi {
  name: string
  state: { value: string; meta: { isValid: boolean; errors: unknown[] } }
  handleBlur: () => void
  handleChange: (value: string) => void
}

function TextField({ field, label, className, type, required }: {
  field: StringFieldApi
  label: string
  className?: string
  type?: React.ComponentProps<typeof Input>['type']
  required?: boolean
}) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} type={type} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={invalid} required={required} />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

interface NumberFieldApi {
  name: string
  state: { value: number; meta: { isValid: boolean; errors: unknown[] } }
  handleBlur: () => void
  handleChange: (value: number) => void
}

function NumberField({ field, label, step = '1' }: { field: NumberFieldApi; label: string; step?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} type="number" min="0" step={step} value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.valueAsNumber)} />
    </Field>
  )
}

function DefinitionItem({ label, value, icon: Icon, wide = false }: { label: string; value: React.ReactNode; icon?: LucideIcon; wide?: boolean }) {
  return (
    <div className={wide ? 'flex flex-col gap-1 sm:col-span-2' : 'flex flex-col gap-1'}>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">{Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}

function getErrorMessage(errors: readonly unknown[]): string | undefined {
  const error = errors.find(Boolean)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return undefined
}
