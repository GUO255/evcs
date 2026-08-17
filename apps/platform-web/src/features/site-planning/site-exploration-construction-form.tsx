import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { CheckIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import {
  siteExplorationErrorMessage,
  updateSiteExplorationConstruction,
  type SiteExplorationConstruction,
  type SiteExplorationRecord,
} from './site-exploration-api'
import { SiteExplorationCompletionBadge } from './site-exploration-completion'
import type { SiteExplorationAutoSaveState } from './site-exploration-form'
import type { SiteExplorationRecordMutation } from './site-exploration-images'

const constructionStatusOptions = [
  { value: 'not-started', label: '未开工' },
  { value: 'under-construction', label: '建设中' },
  { value: 'completed', label: '建设完成' },
] as const

export function SiteExplorationConstructionForm({
  record,
  mutateRecord,
  onAutoSaveStateChange,
}: {
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
  onAutoSaveStateChange?: (state: SiteExplorationAutoSaveState) => void
}) {
  const [value, setValue] = useState<SiteExplorationConstruction>(record.construction)
  const [autoSaveState, setAutoSaveState] = useState<SiteExplorationAutoSaveState>('idle')
  const valueRef = useRef(value)
  const mutateRecordRef = useRef(mutateRecord)
  const autoSaveScheduledRef = useRef(false)
  const completionItems = createConstructionCompletion(value)
  valueRef.current = value
  mutateRecordRef.current = mutateRecord

  useEffect(() => {
    onAutoSaveStateChange?.(autoSaveState)
  }, [autoSaveState, onAutoSaveStateChange])

  useEffect(() => () => onAutoSaveStateChange?.('idle'), [onAutoSaveStateChange])

  useEffect(() => {
    if (sameConstruction(value, record.construction)) {
      autoSaveScheduledRef.current = false
      setAutoSaveState((state) => state === 'scheduled' ? 'saved' : state)
      return
    }

    autoSaveScheduledRef.current = true
    setAutoSaveState('scheduled')
    const timeoutId = window.setTimeout(() => {
      autoSaveScheduledRef.current = false
      void saveConstruction(value)
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [record.construction, value])

  useEffect(() => () => {
    if (!autoSaveScheduledRef.current) return
    autoSaveScheduledRef.current = false
    void persistConstruction(valueRef.current).catch((error: unknown) => {
      toast.error(siteExplorationErrorMessage(error) ?? '建设信息保存失败，请重试。')
    })
  }, [])

  function set<Field extends keyof SiteExplorationConstruction>(
    field: Field,
    nextValue: SiteExplorationConstruction[Field],
  ) {
    setValue((current) => ({ ...current, [field]: nextValue }))
  }

  async function persistConstruction(construction: SiteExplorationConstruction) {
    return mutateRecordRef.current((current) => updateSiteExplorationConstruction(
      current.id,
      construction,
      current.updatedAt,
    ))
  }

  async function saveConstruction(construction: SiteExplorationConstruction) {
    setAutoSaveState('saving')
    try {
      await persistConstruction(construction)
      setAutoSaveState('saved')
    } catch (error) {
      setAutoSaveState('error')
      toast.error(siteExplorationErrorMessage(error) ?? '建设信息保存失败，请重试。')
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>建设信息</CardTitle>
            <CardDescription className="mt-1">维护项目建设阶段的主体、类型及设备规模。</CardDescription>
          </div>
          <SiteExplorationCompletionBadge items={completionItems} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field className="md:col-span-2">
              <FieldLabel>建设状态</FieldLabel>
              <SingleChoice
                value={value.constructionStatus}
                options={constructionStatusOptions}
                onChange={(next) => set('constructionStatus', next)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="construction-entity">建设主体</FieldLabel>
              <Input
                id="construction-entity"
                maxLength={128}
                value={value.constructionEntity}
                onChange={(event) => set('constructionEntity', event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="construction-station-type">建站类型</FieldLabel>
              <Input
                id="construction-station-type"
                maxLength={64}
                value={value.stationType}
                onChange={(event) => set('stationType', event.target.value)}
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>是否配套建设“司机之家”</FieldLabel>
              <SingleChoice
                value={value.driverHomeProvision}
                options={[{ value: 'yes', label: '是' }, { value: 'no', label: '否' }]}
                onChange={(next) => set('driverHomeProvision', next)}
              />
            </Field>
            <CapacityField
              id="charging-equipment-capacity"
              label="充电设备电容量（KVA）"
              value={value.chargingEquipmentCapacityKva}
              onChange={(next) => set('chargingEquipmentCapacityKva', next)}
            />
            <CapacityField
              id="battery-swap-equipment-capacity"
              label="换电设备电容量（KVA）"
              value={value.batterySwapEquipmentCapacityKva}
              onChange={(next) => set('batterySwapEquipmentCapacityKva', next)}
            />
            <CapacityField
              id="photovoltaic-capacity"
              label="光伏规模（KW）"
              value={value.photovoltaicCapacityKw}
              onChange={(next) => set('photovoltaicCapacityKw', next)}
            />
            <CapacityField
              id="energy-storage-capacity"
              label="储能规模（kWh）"
              value={value.energyStorageCapacityKwh}
              onChange={(next) => set('energyStorageCapacityKwh', next)}
            />
          </FieldGroup>
          <p className="text-sm text-muted-foreground" role="status">
            {autoSaveStatusLabel(autoSaveState)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function SingleChoice<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value
  options: readonly { value: Exclude<Value, ''>; label: string }[]
  onChange: (value: Exclude<Value, ''>) => void
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      variant="primary"
      spacing={2}
      onValueChange={(next) => {
        const selected = next[0] as Exclude<Value, ''> | undefined
        if (selected) onChange(selected)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {value === option.value ? <CheckIcon data-icon="inline-start" /> : null}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CapacityField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={0}
        max={999_999_999.99}
        step="0.01"
        value={value || ''}
        onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
      />
    </Field>
  )
}

function sameConstruction(left: SiteExplorationConstruction, right: SiteExplorationConstruction) {
  return left.constructionStatus === right.constructionStatus
    && left.constructionEntity === right.constructionEntity
    && left.stationType === right.stationType
    && left.driverHomeProvision === right.driverHomeProvision
    && left.chargingEquipmentCapacityKva === right.chargingEquipmentCapacityKva
    && left.batterySwapEquipmentCapacityKva === right.batterySwapEquipmentCapacityKva
    && left.photovoltaicCapacityKw === right.photovoltaicCapacityKw
    && left.energyStorageCapacityKwh === right.energyStorageCapacityKwh
}

function autoSaveStatusLabel(state: SiteExplorationAutoSaveState) {
  if (state === 'scheduled') return '修改将在片刻后自动保存。'
  if (state === 'saving') return '正在自动保存…'
  if (state === 'saved') return '已自动保存。'
  if (state === 'error') return '自动保存失败，请修改后重试。'
  return '修改后将自动保存。'
}

export function createConstructionCompletion(value: SiteExplorationConstruction): boolean[] {
  return [
    value.constructionStatus === 'under-construction' || value.constructionStatus === 'completed',
    Boolean(value.constructionEntity.trim()),
    Boolean(value.stationType.trim()),
    Boolean(value.driverHomeProvision),
    value.chargingEquipmentCapacityKva > 0,
    value.batterySwapEquipmentCapacityKva > 0,
    value.photovoltaicCapacityKw > 0,
    value.energyStorageCapacityKwh > 0,
  ]
}
