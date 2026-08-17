import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from '@/components/ui/icons'

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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  deviceTypeOptions,
  getDeviceTypeLabel,
  type ChargingStation,
  type DeviceStatus,
  type DeviceType,
  type StationDevice,
} from './station-data'

interface StationEquipmentProps {
  station: ChargingStation
  onDevicesChange: (devices: readonly StationDevice[]) => void
}

const deviceStatusOptions = [
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
  { value: 'fault', label: '故障' },
] as const satisfies readonly { value: DeviceStatus; label: string }[]

type EquipmentTab = 'photovoltaic' | 'storage' | 'charging'

const equipmentTabs: readonly {
  value: EquipmentTab
  label: string
  deviceTypes: readonly DeviceType[]
}[] = [
  { value: 'photovoltaic', label: '光伏', deviceTypes: ['photovoltaic'] },
  { value: 'storage', label: '储能', deviceTypes: ['storage'] },
  { value: 'charging', label: '充电桩', deviceTypes: ['charger', 'connector'] },
]

export function StationEquipment({ station, onDevicesChange }: StationEquipmentProps) {
  const [activeTab, setActiveTab] = useState<EquipmentTab>('photovoltaic')
  const [formDevice, setFormDevice] = useState<StationDevice | null | undefined>(undefined)
  const [detailDevice, setDetailDevice] = useState<StationDevice | null>(null)
  const [deleteDevice, setDeleteDevice] = useState<StationDevice | null>(null)

  function saveDevice(input: StationDeviceInput) {
    if (formDevice) {
      onDevicesChange(station.devices.map((device) => device.id === formDevice.id ? { ...device, ...input } : device))
    } else {
      onDevicesChange([...station.devices, { id: crypto.randomUUID(), ...input }])
    }
    setFormDevice(undefined)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>设备清单</CardTitle>
          <CardDescription>光伏、储能、充电桩及充电枪设备状态。</CardDescription>
          <CardAction>
            <Button onClick={() => setFormDevice(null)}>
              <PlusIcon data-icon="inline-start" />
              新增设备
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EquipmentTab)}>
            <TabsList variant="line">
              {equipmentTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}（{station.devices.filter((device) => tab.deviceTypes.includes(device.type)).length}）
                </TabsTrigger>
              ))}
            </TabsList>
            {equipmentTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <DeviceTable
                  devices={station.devices.filter((device) => tab.deviceTypes.includes(device.type))}
                  onView={setDetailDevice}
                  onEdit={setFormDevice}
                  onDelete={setDeleteDevice}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <DeviceFormDialog
        open={formDevice !== undefined}
        device={formDevice ?? undefined}
        defaultType={activeTab === 'charging' ? 'charger' : activeTab}
        devices={station.devices}
        onOpenChange={(open) => { if (!open) setFormDevice(undefined) }}
        onSave={saveDevice}
      />
      <DeviceDetailDialog device={detailDevice} onOpenChange={(open) => { if (!open) setDetailDevice(null) }} />
      <DeviceDeleteDialog
        device={deleteDevice}
        onOpenChange={(open) => { if (!open) setDeleteDevice(null) }}
        onConfirm={() => {
          if (deleteDevice) onDevicesChange(station.devices.filter((device) => device.id !== deleteDevice.id))
          setDeleteDevice(null)
        }}
      />
    </div>
  )
}

function DeviceTable({ devices, onView, onEdit, onDelete }: {
  devices: readonly StationDevice[]
  onView: (device: StationDevice) => void
  onEdit: (device: StationDevice) => void
  onDelete: (device: StationDevice) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>图片</TableHead>
            <TableHead>设备类型</TableHead>
            <TableHead>设备编号</TableHead>
            <TableHead>设备名称</TableHead>
            <TableHead>型号</TableHead>
            <TableHead>生产厂商</TableHead>
            <TableHead>额定参数</TableHead>
            <TableHead>安装位置</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length > 0 ? devices.map((device) => (
            <TableRow
              key={device.id}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              tabIndex={0}
              onClick={() => onView(device)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onView(device)
              }}
            >
              <TableCell>
                <img className="size-12 rounded-md object-cover" src={device.image} alt={device.name} loading="lazy" />
              </TableCell>
              <TableCell><DeviceTypeBadge type={device.type} /></TableCell>
              <TableCell className="font-medium">{device.code}</TableCell>
              <TableCell>{device.name}</TableCell>
              <TableCell>{device.model}</TableCell>
              <TableCell>{device.manufacturer}</TableCell>
              <TableCell>{device.ratedPower}</TableCell>
              <TableCell>{device.location}</TableCell>
              <TableCell><DeviceStatusBadge status={device.status} /></TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${device.name}操作菜单`} />}>
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => onView(device)}><EyeIcon />查看详情</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(device)}><PencilIcon />编辑</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(device)}><Trash2Icon />删除</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">暂无设备，点击“新增设备”录入。</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

type StationDeviceInput = Omit<StationDevice, 'id'>

const emptyDeviceInput: StationDeviceInput = {
  code: '',
  type: 'charger',
  name: '',
  image: '',
  model: '',
  manufacturer: '',
  ratedPower: '',
  location: '',
  status: 'online',
}

function DeviceFormDialog({ open, device, defaultType, devices, onOpenChange, onSave }: {
  open: boolean
  device?: StationDevice
  defaultType: DeviceType
  devices: readonly StationDevice[]
  onOpenChange: (open: boolean) => void
  onSave: (input: StationDeviceInput) => void
}) {
  const editing = Boolean(device)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const form = useForm({
    defaultValues: emptyDeviceInput,
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateDeviceInput(value, devices, device?.id)
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => onSave(normalizeDeviceInput(value)),
  })

  useEffect(() => {
    if (open) form.reset(device ? deviceToInput(device) : { ...emptyDeviceInput, type: defaultType })
  }, [defaultType, device, form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑设备' : '新增设备'}</DialogTitle>
          <DialogDescription>填写设备基础资料、安装位置和当前运行状态。</DialogDescription>
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
          <form.Field name="image">
            {(field) => {
              const invalid = !field.state.meta.isValid
              return (
                <Field data-invalid={invalid}>
                  <FieldLabel htmlFor="device-image">设备图片 *</FieldLabel>
                  <div className="flex items-end gap-4">
                    {field.state.value ? (
                      <img className="size-40 rounded-lg object-cover" src={field.state.value} alt="设备图片预览" />
                    ) : (
                      <div className="flex size-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                        暂无图片
                      </div>
                    )}
                    <Input
                      ref={fileInputRef}
                      id="device-image"
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (file) field.handleChange(await readImageFile(file))
                        event.target.value = ''
                      }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <UploadIcon data-icon="inline-start" />
                      {field.state.value ? '更换图片' : '上传图片'}
                    </Button>
                  </div>
                  <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
                </Field>
              )
            }}
          </form.Field>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <form.Field name="type">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>设备类型 *</FieldLabel>
                  <Select items={deviceTypeOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as DeviceType)}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{deviceTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="code">{(field) => <TextField field={field} label="设备编号 *" />}</form.Field>
            <form.Field name="name">{(field) => <TextField field={field} label="设备名称 *" />}</form.Field>
            <form.Field name="model">{(field) => <TextField field={field} label="设备型号 *" />}</form.Field>
            <form.Field name="manufacturer">{(field) => <TextField field={field} label="生产厂商 *" />}</form.Field>
            <form.Field name="ratedPower">{(field) => <TextField field={field} label="额定参数 *" placeholder="例如：240 kW" />}</form.Field>
            <form.Field name="location">{(field) => <TextField field={field} label="安装位置 *" />}</form.Field>
            <form.Field name="status">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>运行状态 *</FieldLabel>
                  <Select items={deviceStatusOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as DeviceStatus)}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{deviceStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">{editing ? '保存修改' : '新增设备'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeviceDetailDialog({ device, onOpenChange }: { device: StationDevice | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={Boolean(device)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>设备详情</DialogTitle>
          <DialogDescription>{device ? `${device.code} · ${device.name}` : '查看设备完整资料。'}</DialogDescription>
        </DialogHeader>
        {device ? (
          <div className="flex flex-col gap-5">
            <img className="size-40 rounded-lg object-cover" src={device.image} alt={device.name} />
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="设备类型" value={<DeviceTypeBadge type={device.type} />} />
              <DetailItem label="运行状态" value={<DeviceStatusBadge status={device.status} />} />
              <DetailItem label="设备编号" value={device.code} />
              <DetailItem label="设备名称" value={device.name} />
              <DetailItem label="设备型号" value={device.model} />
              <DetailItem label="生产厂商" value={device.manufacturer} />
              <DetailItem label="额定参数" value={device.ratedPower} />
              <DetailItem label="安装位置" value={device.location} />
            </dl>
          </div>
        ) : null}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeviceDeleteDialog({ device, onOpenChange, onConfirm }: { device: StationDevice | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={Boolean(device)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><Trash2Icon /></AlertDialogMedia>
          <AlertDialogTitle>删除设备？</AlertDialogTitle>
          <AlertDialogDescription>将删除“{device?.name}”的 Mock 设备资料，本次操作无法撤销。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface StringFieldApi {
  name: string
  state: { value: string; meta: { isValid: boolean; errors: unknown[] } }
  handleBlur: () => void
  handleChange: (value: string) => void
}

function TextField({ field, label, placeholder }: { field: StringFieldApi; label: string; placeholder?: string }) {
  const invalid = !field.state.meta.isValid
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} value={field.state.value} placeholder={placeholder} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={invalid} />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

function validateDeviceInput(value: StationDeviceInput, devices: readonly StationDevice[], currentDeviceId?: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!value.image) errors.image = '请上传设备图片'
  const requiredFields: Array<[keyof StationDeviceInput, string]> = [
    ['code', '请输入设备编号'], ['name', '请输入设备名称'], ['model', '请输入设备型号'],
    ['manufacturer', '请输入生产厂商'], ['ratedPower', '请输入额定参数'], ['location', '请输入安装位置'],
  ]
  for (const [field, message] of requiredFields) {
    if (!String(value[field]).trim()) errors[field] = message
  }
  const normalizedCode = value.code.trim().toLocaleLowerCase('zh-CN')
  if (devices.some((device) => device.id !== currentDeviceId && device.code.trim().toLocaleLowerCase('zh-CN') === normalizedCode)) {
    errors.code = '设备编号已存在'
  }
  return errors
}

function normalizeDeviceInput(value: StationDeviceInput): StationDeviceInput {
  return {
    ...value,
    code: value.code.trim(),
    name: value.name.trim(),
    model: value.model.trim(),
    manufacturer: value.manufacturer.trim(),
    ratedPower: value.ratedPower.trim(),
    location: value.location.trim(),
  }
}

function deviceToInput(device: StationDevice): StationDeviceInput {
  const { id: _id, ...input } = device
  return input
}

function DeviceTypeBadge({ type }: { type: DeviceType }) {
  return <Badge variant="secondary">{getDeviceTypeLabel(type)}</Badge>
}

function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const option = deviceStatusOptions.find((candidate) => candidate.value === status)
  const variant = status === 'online' ? 'default' : 'destructive'
  return <Badge variant={variant}>{option?.label}</Badge>
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

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
