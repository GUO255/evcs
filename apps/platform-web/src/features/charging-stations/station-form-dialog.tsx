import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { stationStatusOptions, type StationStatus } from './station-data'
import { useStations } from './station-store'

interface StationFormValues {
  code: string
  name: string
  status: StationStatus
  operatorName: string
  servicePhone: string
  province: string
  city: string
  district: string
  address: string
  longitude: string
  latitude: string
  serviceHours: string
  openedAt: string
  parkingSpaces: string
  dcChargerCount: string
  acChargerCount: string
  connectorCount: string
  solarCapacityKw: string
  storageCapacityKwh: string
  imageUrl: string
}

type StationFormErrors = Partial<Record<keyof StationFormValues, string>>

const emptyStationFormValues: StationFormValues = {
  code: '',
  name: '',
  status: 'planned',
  operatorName: '',
  servicePhone: '',
  province: '河南省',
  city: '',
  district: '',
  address: '',
  longitude: '',
  latitude: '',
  serviceHours: '24 小时',
  openedAt: '',
  parkingSpaces: '0',
  dcChargerCount: '0',
  acChargerCount: '0',
  connectorCount: '0',
  solarCapacityKw: '0',
  storageCapacityKwh: '0',
  imageUrl: 'https://images.unsplash.com/photo-1741513116594-f4e108dfbf3c?auto=format&fit=crop&w=1600&q=80',
}

interface StationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StationFormDialog({ open, onOpenChange }: StationFormDialogProps) {
  const { stations, createStation } = useStations()
  const [values, setValues] = useState<StationFormValues>(emptyStationFormValues)
  const [errors, setErrors] = useState<StationFormErrors>({})

  useEffect(() => {
    if (!open) return
    setValues(emptyStationFormValues)
    setErrors({})
  }, [open])

  function updateValue<Key extends keyof StationFormValues>(key: Key, value: StationFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateStation(values, stations.map((station) => station.code))
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    createStation({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      status: values.status,
      operatorName: values.operatorName.trim(),
      servicePhone: values.servicePhone.trim(),
      province: values.province.trim(),
      city: values.city.trim(),
      district: values.district.trim(),
      address: values.address.trim(),
      longitude: Number(values.longitude),
      latitude: Number(values.latitude),
      serviceHours: values.serviceHours.trim(),
      openedAt: values.openedAt,
      parkingSpaces: Number(values.parkingSpaces),
      dcChargerCount: Number(values.dcChargerCount),
      acChargerCount: Number(values.acChargerCount),
      connectorCount: Number(values.connectorCount),
      solarCapacityKw: Number(values.solarCapacityKw),
      storageCapacityKwh: Number(values.storageCapacityKwh),
      images: [values.imageUrl.trim()],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>新增充电站</DialogTitle>
          <DialogDescription>填写站点基础资料和运营参数，保存后可继续配置设备、设施、工作人员和商户。</DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-col gap-4" onSubmit={submit} noValidate>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-1 py-1">
            <FieldSet>
              <FieldLegend>基础信息</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <StationTextField label="站点编号 *" value={values.code} error={errors.code} onChange={(value) => updateValue('code', value)} required />
                <StationTextField label="站点名称 *" value={values.name} error={errors.name} onChange={(value) => updateValue('name', value)} required />
                <Field data-invalid={Boolean(errors.status)}>
                  <FieldLabel>运营状态 *</FieldLabel>
                  <Select items={stationStatusOptions} value={values.status} onValueChange={(value) => updateValue('status', value as StationStatus)}>
                    <SelectTrigger className="w-full" aria-invalid={Boolean(errors.status)}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {stationStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.status}</FieldError>
                </Field>
                <StationTextField label="运营商户 *" value={values.operatorName} error={errors.operatorName} onChange={(value) => updateValue('operatorName', value)} required />
                <StationTextField label="服务电话 *" value={values.servicePhone} error={errors.servicePhone} onChange={(value) => updateValue('servicePhone', value)} required />
                <StationTextField label="服务时间 *" value={values.serviceHours} error={errors.serviceHours} onChange={(value) => updateValue('serviceHours', value)} required />
                <StationTextField label="投运日期 *" type="date" value={values.openedAt} error={errors.openedAt} onChange={(value) => updateValue('openedAt', value)} required />
                <StationTextField className="md:col-span-2" label="站点图片 URL *" type="url" value={values.imageUrl} error={errors.imageUrl} onChange={(value) => updateValue('imageUrl', value)} required />
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>地址与坐标</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <StationTextField label="省份 *" value={values.province} error={errors.province} onChange={(value) => updateValue('province', value)} required />
                <StationTextField label="城市 *" value={values.city} error={errors.city} onChange={(value) => updateValue('city', value)} required />
                <StationTextField label="区县 *" value={values.district} error={errors.district} onChange={(value) => updateValue('district', value)} required />
                <StationTextField className="md:col-span-3" label="详细地址 *" value={values.address} error={errors.address} onChange={(value) => updateValue('address', value)} required />
                <StationTextField label="经度 *" type="number" step="any" value={values.longitude} error={errors.longitude} onChange={(value) => updateValue('longitude', value)} required />
                <StationTextField label="纬度 *" type="number" step="any" value={values.latitude} error={errors.latitude} onChange={(value) => updateValue('latitude', value)} required />
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>站点规模</FieldLegend>
              <FieldGroup className="grid gap-4 md:grid-cols-3">
                <StationTextField label="停车位" type="number" min="0" step="1" value={values.parkingSpaces} error={errors.parkingSpaces} onChange={(value) => updateValue('parkingSpaces', value)} />
                <StationTextField label="直流充电桩" type="number" min="0" step="1" value={values.dcChargerCount} error={errors.dcChargerCount} onChange={(value) => updateValue('dcChargerCount', value)} />
                <StationTextField label="交流充电桩" type="number" min="0" step="1" value={values.acChargerCount} error={errors.acChargerCount} onChange={(value) => updateValue('acChargerCount', value)} />
                <StationTextField label="充电枪" type="number" min="0" step="1" value={values.connectorCount} error={errors.connectorCount} onChange={(value) => updateValue('connectorCount', value)} />
                <StationTextField label="光伏容量（kW）" type="number" min="0" step="any" value={values.solarCapacityKw} error={errors.solarCapacityKw} onChange={(value) => updateValue('solarCapacityKw', value)} />
                <StationTextField label="储能容量（kWh）" type="number" min="0" step="any" value={values.storageCapacityKwh} error={errors.storageCapacityKwh} onChange={(value) => updateValue('storageCapacityKwh', value)} />
              </FieldGroup>
            </FieldSet>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">新增站点</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface StationTextFieldProps {
  label: string
  value: string
  error?: string
  className?: string
  type?: React.ComponentProps<typeof Input>['type']
  min?: string
  step?: string
  required?: boolean
  onChange: (value: string) => void
}

function StationTextField({ label, value, error, className, type, min, step, required, onChange }: StationTextFieldProps) {
  return (
    <Field className={className} data-invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        required={required}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function validateStation(values: StationFormValues, stationCodes: readonly string[]): StationFormErrors {
  const errors: StationFormErrors = {}
  const requiredFields: Array<keyof StationFormValues> = [
    'code', 'name', 'operatorName', 'servicePhone', 'province', 'city', 'district', 'address',
    'longitude', 'latitude', 'serviceHours', 'openedAt', 'imageUrl',
  ]
  for (const field of requiredFields) {
    if (!values[field].trim()) errors[field] = '此项为必填项'
  }

  if (stationCodes.some((code) => code.toUpperCase() === values.code.trim().toUpperCase())) {
    errors.code = '站点编号已存在'
  }

  const numberFields: Array<keyof StationFormValues> = [
    'parkingSpaces', 'dcChargerCount', 'acChargerCount', 'connectorCount',
    'solarCapacityKw', 'storageCapacityKwh',
  ]
  for (const field of numberFields) {
    const number = Number(values[field])
    if (!Number.isFinite(number) || number < 0) errors[field] = '请输入大于或等于 0 的数值'
  }
  if (!Number.isInteger(Number(values.parkingSpaces))) errors.parkingSpaces = '请输入整数'
  if (!Number.isInteger(Number(values.dcChargerCount))) errors.dcChargerCount = '请输入整数'
  if (!Number.isInteger(Number(values.acChargerCount))) errors.acChargerCount = '请输入整数'
  if (!Number.isInteger(Number(values.connectorCount))) errors.connectorCount = '请输入整数'

  const longitude = Number(values.longitude)
  const latitude = Number(values.latitude)
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = '经度范围应为 -180 至 180'
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = '纬度范围应为 -90 至 90'

  try {
    const imageUrl = new URL(values.imageUrl)
    if (!['http:', 'https:'].includes(imageUrl.protocol)) errors.imageUrl = '请输入有效的 HTTP(S) 图片地址'
  } catch {
    errors.imageUrl = '请输入有效的图片地址'
  }

  return errors
}
