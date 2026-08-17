import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type { NearbyTruckChargingStation } from './site-exploration-api'

const utilizationOptions = ['低', '中', '高', '较高', '非常高'] as const

export function SiteExplorationNearbyStationSurveyDialog({
  station,
  onSave,
}: {
  station: NearbyTruckChargingStation
  onSave: (station: NearbyTruckChargingStation) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(station)

  const setDialogOpen = (nextOpen: boolean) => {
    if (nextOpen) setDraft(station)
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" className="shrink-0" />}>
        补充调研信息
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>补充调研信息</DialogTitle>
          <DialogDescription>补充该新能源重卡充电站的规模、设备、使用率及电费信息。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <LabeledField label="站点名称">
            <Input
              aria-label="站点名称"
              maxLength={128}
              value={draft.name}
              placeholder="填写站点名称"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="规模">
            <Input
              aria-label="规模"
              maxLength={255}
              value={draft.surveyScale}
              placeholder="填写规模"
              onChange={(event) => setDraft({ ...draft, surveyScale: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="型号/数量">
            <Input
              aria-label="型号及数量"
              maxLength={255}
              value={draft.surveyModelQuantity}
              placeholder="填写型号及数量"
              onChange={(event) => setDraft({ ...draft, surveyModelQuantity: event.target.value })}
            />
          </LabeledField>
          <LabeledField label="使用率">
            <ToggleGroup
              className="grid w-full grid-cols-1 items-stretch"
              value={draft.surveyUtilizationRate ? [draft.surveyUtilizationRate] : []}
              onValueChange={(next) => setDraft({
                ...draft,
                surveyUtilizationRate: (next[0] ?? '') as NearbyTruckChargingStation['surveyUtilizationRate'],
              })}
            >
              {utilizationOptions.map((option) => (
                <ToggleGroupItem key={option} className="h-auto min-h-10 justify-start gap-2 px-3 py-2 text-left" variant="outline" value={option}>
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input">
                    <span className="size-2 rounded-full bg-primary opacity-0 group-aria-pressed/toggle:opacity-100" />
                  </span>
                  <span>{option}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </LabeledField>
          <LabeledField label="电费">
            <Textarea
              className="min-h-32"
              aria-label="电费"
              maxLength={1000}
              value={draft.surveyElectricityPrice}
              placeholder="填写分时电价或综合电费"
              onChange={(event) => setDraft({ ...draft, surveyElectricityPrice: event.target.value })}
            />
          </LabeledField>
        </div>
        <DialogFooter className="border-t border-border pt-4">
          <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            type="button"
            size="sm"
            disabled={!draft.name.trim()}
            onClick={() => { onSave({ ...draft, name: draft.name.trim() }); setOpen(false) }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return <Field><FieldLabel>{label}</FieldLabel>{children}</Field>
}
