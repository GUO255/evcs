import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from '@/components/ui/icons'

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

import {
  getStaffRoleLabel,
  type ChargingStation,
  type StaffRole,
  type StationStaff,
} from './station-data'

interface StationStaffProps {
  station: ChargingStation
  onStaffChange: (staff: readonly StationStaff[]) => void
}

const staffRoleOptions = [
  { value: 'manager', label: '站长' },
  { value: 'operations', label: '运维人员' },
  { value: 'service', label: '客服人员' },
  { value: 'security', label: '安保人员' },
] as const satisfies readonly { value: StaffRole; label: string }[]

const staffStatusOptions = [
  { value: 'on-duty', label: '在岗' },
  { value: 'off-duty', label: '休班' },
] as const satisfies readonly { value: StationStaff['status']; label: string }[]

export function StationStaffList({ station, onStaffChange }: StationStaffProps) {
  const [formPerson, setFormPerson] = useState<StationStaff | null | undefined>(undefined)
  const [detailPerson, setDetailPerson] = useState<StationStaff | null>(null)
  const [deletePerson, setDeletePerson] = useState<StationStaff | null>(null)

  function savePerson(input: StationStaffInput) {
    if (formPerson) {
      onStaffChange(station.staff.map((person) => person.id === formPerson.id ? { ...person, ...input } : person))
    } else {
      onStaffChange([...station.staff, { id: crypto.randomUUID(), ...input }])
    }
    setFormPerson(undefined)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>场站工作人员</CardTitle>
          <CardDescription>站长、运维、客服及安保人员排班信息。</CardDescription>
          <CardAction>
            <Button onClick={() => setFormPerson(null)}>
              <PlusIcon data-icon="inline-start" />
              新增工作人员
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>岗位</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>工作班次</TableHead>
                  <TableHead>当前状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {station.staff.length > 0 ? station.staff.map((person) => (
                  <TableRow
                    key={person.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    tabIndex={0}
                    onClick={() => setDetailPerson(person)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setDetailPerson(person)
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Avatar size="sm"><AvatarFallback>{person.name.slice(-1)}</AvatarFallback></Avatar>
                        {person.name}
                      </div>
                    </TableCell>
                    <TableCell>{getStaffRoleLabel(person.role)}</TableCell>
                    <TableCell>{person.mobile}</TableCell>
                    <TableCell>{person.workShift}</TableCell>
                    <TableCell><StaffStatusBadge status={person.status} /></TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开${person.name}操作菜单`} />}>
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => setDetailPerson(person)}><EyeIcon />查看详情</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFormPerson(person)}><PencilIcon />编辑</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletePerson(person)}><Trash2Icon />删除</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">暂无工作人员，点击“新增工作人员”录入。</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StaffFormDialog
        open={formPerson !== undefined}
        person={formPerson ?? undefined}
        onOpenChange={(open) => { if (!open) setFormPerson(undefined) }}
        onSave={savePerson}
      />
      <StaffDetailDialog person={detailPerson} onOpenChange={(open) => { if (!open) setDetailPerson(null) }} />
      <StaffDeleteDialog
        person={deletePerson}
        onOpenChange={(open) => { if (!open) setDeletePerson(null) }}
        onConfirm={() => {
          if (deletePerson) onStaffChange(station.staff.filter((person) => person.id !== deletePerson.id))
          setDeletePerson(null)
        }}
      />
    </>
  )
}

type StationStaffInput = Omit<StationStaff, 'id'>

const emptyStaffInput: StationStaffInput = {
  name: '',
  role: 'operations',
  mobile: '',
  workShift: '',
  status: 'on-duty',
}

function StaffFormDialog({ open, person, onOpenChange, onSave }: {
  open: boolean
  person?: StationStaff
  onOpenChange: (open: boolean) => void
  onSave: (input: StationStaffInput) => void
}) {
  const editing = Boolean(person)
  const form = useForm({
    defaultValues: emptyStaffInput,
    validators: {
      onSubmit: ({ value }) => {
        const errors = validateStaffInput(value)
        return Object.keys(errors).length > 0 ? { fields: errors } : undefined
      },
    },
    onSubmit: ({ value }) => onSave(normalizeStaffInput(value)),
  })

  useEffect(() => {
    if (open) form.reset(person ? personToInput(person) : emptyStaffInput)
  }, [form, open, person])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑工作人员' : '新增工作人员'}</DialogTitle>
          <DialogDescription>填写工作人员联系方式、岗位和排班信息。</DialogDescription>
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
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <form.Field name="name">{(field) => <TextField field={field} label="姓名 *" />}</form.Field>
            <form.Field name="mobile">{(field) => <TextField field={field} label="联系电话 *" />}</form.Field>
            <form.Field name="role">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>岗位 *</FieldLabel>
                  <Select items={staffRoleOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as StaffRole)}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{staffRoleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="status">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>当前状态 *</FieldLabel>
                  <Select items={staffStatusOptions} value={field.state.value} onValueChange={(value) => field.handleChange(value as StationStaff['status'])}>
                    <SelectTrigger id={field.name} className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{staffStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="workShift">{(field) => <TextField field={field} label="工作班次 *" className="md:col-span-2" placeholder="例如：白班 08:00–20:00" />}</form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">{editing ? '保存修改' : '新增工作人员'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StaffDetailDialog({ person, onOpenChange }: { person: StationStaff | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={Boolean(person)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>工作人员详情</DialogTitle>
          <DialogDescription>查看场站工作人员的岗位与排班资料。</DialogDescription>
        </DialogHeader>
        {person ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar><AvatarFallback>{person.name.slice(-1)}</AvatarFallback></Avatar>
              <div className="flex flex-col gap-1"><strong>{person.name}</strong><span className="text-sm text-muted-foreground">{getStaffRoleLabel(person.role)}</span></div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="联系电话" value={person.mobile} />
              <DetailItem label="当前状态" value={<StaffStatusBadge status={person.status} />} />
              <DetailItem label="工作班次" value={person.workShift} wide />
            </dl>
          </div>
        ) : null}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StaffDeleteDialog({ person, onOpenChange, onConfirm }: { person: StationStaff | null; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={Boolean(person)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><Trash2Icon /></AlertDialogMedia>
          <AlertDialogTitle>删除工作人员？</AlertDialogTitle>
          <AlertDialogDescription>将删除“{person?.name}”的 Mock 工作人员资料，本次操作无法撤销。</AlertDialogDescription>
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

function TextField({ field, label, className, placeholder }: { field: StringFieldApi; label: string; className?: string; placeholder?: string }) {
  const invalid = !field.state.meta.isValid
  return (
    <Field className={className} data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input id={field.name} name={field.name} value={field.state.value} placeholder={placeholder} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={invalid} />
      <FieldError>{getErrorMessage(field.state.meta.errors)}</FieldError>
    </Field>
  )
}

function validateStaffInput(value: StationStaffInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!value.name.trim()) errors.name = '请输入姓名'
  if (!value.mobile.trim()) errors.mobile = '请输入联系电话'
  if (!value.workShift.trim()) errors.workShift = '请输入工作班次'
  return errors
}

function normalizeStaffInput(value: StationStaffInput): StationStaffInput {
  return { ...value, name: value.name.trim(), mobile: value.mobile.trim(), workShift: value.workShift.trim() }
}

function personToInput(person: StationStaff): StationStaffInput {
  const { id: _id, ...input } = person
  return input
}

function StaffStatusBadge({ status }: { status: StationStaff['status'] }) {
  return <Badge variant={status === 'on-duty' ? 'default' : 'destructive'}>{status === 'on-duty' ? '在岗' : '休班'}</Badge>
}

function DetailItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'flex flex-col gap-1 sm:col-span-2' : 'flex flex-col gap-1'}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
}

function getErrorMessage(errors: readonly unknown[]): string | undefined {
  const error = errors.find(Boolean)
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return undefined
}
