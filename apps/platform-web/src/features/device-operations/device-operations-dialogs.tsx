import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import type { DeviceAlert, WorkOrder } from './device-operations-data'
import { formatRepairCost } from './device-operations-data'
import { useDeviceOperations } from './device-operations-store'

const maintainers = ['张志强', '王海峰', '李建国', '刘宇'] as const

interface DialogProps<T> {
  item?: T
  onOpenChange: (open: boolean) => void
}

export function DispatchWorkOrderDialog({ item: alert, onOpenChange }: DialogProps<DeviceAlert>) {
  const { dispatchAlert } = useDeviceOperations()
  const [assignee, setAssignee] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requirement, setRequirement] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!alert) return
    setAssignee('')
    setDeadline('')
    setRequirement(`排查“${alert.title}”告警原因，修复后完成设备功能和安全测试。`)
    setSubmitted(false)
  }, [alert])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!alert || !assignee || !deadline || !requirement.trim()) return
    dispatchAlert(alert.id, { assignee, deadline: new Date(deadline).toISOString(), requirement: requirement.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={Boolean(alert)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>派发维修工单</DialogTitle>
          <DialogDescription>{alert ? `${alert.stationName} · ${alert.deviceCode} · ${alert.title}` : ''}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={submitted && !assignee}>
              <FieldLabel>维修人员 *</FieldLabel>
              <Select value={assignee} onValueChange={(value) => setAssignee(value ?? '')}>
                <SelectTrigger className="w-full" aria-invalid={submitted && !assignee}>
                  <SelectValue placeholder="请选择维修人员" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {maintainers.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {submitted && !assignee ? <FieldError>请选择维修人员</FieldError> : null}
            </Field>
            <Field data-invalid={submitted && !deadline}>
              <FieldLabel htmlFor="dispatch-deadline">要求完成时间 *</FieldLabel>
              <Input id="dispatch-deadline" type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-invalid={submitted && !deadline} />
              {submitted && !deadline ? <FieldError>请选择要求完成时间</FieldError> : null}
            </Field>
            <Field data-invalid={submitted && !requirement.trim()}>
              <FieldLabel htmlFor="dispatch-requirement">处理要求 *</FieldLabel>
              <Textarea id="dispatch-requirement" rows={4} value={requirement} onChange={(event) => setRequirement(event.target.value)} aria-invalid={submitted && !requirement.trim()} />
              {submitted && !requirement.trim() ? <FieldError>请输入处理要求</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">确认派发</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CompleteWorkOrderDialog({ item: order, onOpenChange }: DialogProps<WorkOrder>) {
  const { completeWorkOrder } = useDeviceOperations()
  const [resolution, setResolution] = useState('')
  const [replacedParts, setReplacedParts] = useState('')
  const [cost, setCost] = useState('0')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!order) return
    setResolution('')
    setReplacedParts('')
    setCost('0')
    setSubmitted(false)
  }, [order])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const numericCost = Number(cost)
    if (!order || !resolution.trim() || !Number.isFinite(numericCost) || numericCost < 0) return
    completeWorkOrder(order.id, { resolution: resolution.trim(), replacedParts: replacedParts.trim() || '无', cost: numericCost })
    onOpenChange(false)
  }

  const costInvalid = submitted && (!Number.isFinite(Number(cost)) || Number(cost) < 0)
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>提交维修结果</DialogTitle>
          <DialogDescription>{order ? `${order.code} · ${order.stationName} · ${order.deviceCode}` : ''}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={submitted && !resolution.trim()}>
              <FieldLabel htmlFor="completion-resolution">维修结果 *</FieldLabel>
              <Textarea id="completion-resolution" rows={4} value={resolution} onChange={(event) => setResolution(event.target.value)} aria-invalid={submitted && !resolution.trim()} placeholder="填写故障原因、维修措施和测试结果" />
              {submitted && !resolution.trim() ? <FieldError>请输入维修结果</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="completion-parts">更换配件</FieldLabel>
              <Input id="completion-parts" value={replacedParts} onChange={(event) => setReplacedParts(event.target.value)} placeholder="未更换配件可留空" />
            </Field>
            <Field data-invalid={costInvalid}>
              <FieldLabel htmlFor="completion-cost">维修费用（元） *</FieldLabel>
              <Input id="completion-cost" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} aria-invalid={costInvalid} />
              {costInvalid ? <FieldError>维修费用必须是不小于 0 的金额</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">提交验收</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AcceptWorkOrderDialog({ item: order, onOpenChange }: DialogProps<WorkOrder>) {
  const { acceptWorkOrder } = useDeviceOperations()
  const [result, setResult] = useState<'accepted' | 'rework'>('accepted')
  const [acceptedBy, setAcceptedBy] = useState('')
  const [remark, setRemark] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!order) return
    setResult('accepted')
    setAcceptedBy('')
    setRemark('')
    setSubmitted(false)
  }, [order])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!order || !acceptedBy.trim() || !remark.trim()) return
    acceptWorkOrder(order.id, { result, acceptedBy: acceptedBy.trim(), remark: remark.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>工单验收</DialogTitle>
          <DialogDescription>{order ? `${order.code} · 维修人 ${order.assignee}` : ''}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">维修结果</CardTitle>
              <CardDescription>{order?.resolution || '暂无维修结果'}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span>更换配件：{order?.replacedParts || '无'}</span>
              <span>维修费用：{formatRepairCost(order?.cost ?? 0)}</span>
            </CardContent>
          </Card>
          <FieldGroup>
            <Field>
              <FieldLabel>验收结论 *</FieldLabel>
              <Select value={result} onValueChange={(value) => setResult(value as 'accepted' | 'rework')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="accepted">验收通过</SelectItem>
                    <SelectItem value="rework">退回返工</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={submitted && !acceptedBy.trim()}>
              <FieldLabel htmlFor="acceptance-person">验收人 *</FieldLabel>
              <Input id="acceptance-person" value={acceptedBy} onChange={(event) => setAcceptedBy(event.target.value)} aria-invalid={submitted && !acceptedBy.trim()} />
              {submitted && !acceptedBy.trim() ? <FieldError>请输入验收人</FieldError> : null}
            </Field>
            <Field data-invalid={submitted && !remark.trim()}>
              <FieldLabel htmlFor="acceptance-remark">验收说明 *</FieldLabel>
              <Textarea id="acceptance-remark" rows={4} value={remark} onChange={(event) => setRemark(event.target.value)} aria-invalid={submitted && !remark.trim()} placeholder={result === 'accepted' ? '填写功能、安全及现场验收结果' : '填写需要返工的问题和要求'} />
              {submitted && !remark.trim() ? <FieldError>请输入验收说明</FieldError> : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" variant={result === 'rework' ? 'destructive' : 'default'}>{result === 'accepted' ? '确认通过' : '退回返工'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
