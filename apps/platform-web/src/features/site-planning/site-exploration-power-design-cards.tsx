import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type { SiteExplorationInput } from './site-exploration-api'
import { getSiteExplorationFormSection } from './site-exploration-form-sections'

type SurveyDetailField =
  | 'powerAccessMethod'
  | 'electricityNature'
  | 'highVoltageAccessMethod'
  | 'tenKvLineAccessDistanceMeters'
  | 'surveyRecommendation'
  | 'chargingPileModel'
  | 'chargingPileQuantity'
  | 'transformerCapacity'
  | 'transformerQuantity'
  | 'preliminaryDesignNotes'

export type SiteExplorationSurveyDetailSetter = <K extends SurveyDetailField>(
  field: K,
  value: SiteExplorationInput[K],
) => void

export function SiteExplorationPowerCard({
  value,
  onChange,
}: {
  value: SiteExplorationInput
  onChange: SiteExplorationSurveyDetailSetter
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{getSiteExplorationFormSection('power').label}</CardTitle>
        <CardDescription className="mt-1">电力接入条件</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-0">
        <SurveyCardField number={23} title="电力接入条件">
          <div className="grid gap-4">
            <LabeledControl label="电源接入方式">
              <SingleSelect
                value={value.powerAccessMethod}
                options={[{ value: '10kv', label: '10kV' }, { value: '0.4kv', label: '0.4kV' }]}
                onChange={(next) => onChange('powerAccessMethod', next as SiteExplorationInput['powerAccessMethod'])}
              />
            </LabeledControl>
            <LabeledControl label="用电性质">
              <SingleSelect
                value={value.electricityNature}
                options={[{ value: 'industrial', label: '工业' }, { value: 'commercial', label: '商业' }]}
                onChange={(next) => onChange('electricityNature', next as SiteExplorationInput['electricityNature'])}
              />
            </LabeledControl>
            <LabeledControl label="高压接入方式">
              <SingleSelect
                value={value.highVoltageAccessMethod}
                options={[{ value: 'new-box-transformer', label: '新建箱变' }, { value: 'distribution-room', label: '配电室' }]}
                onChange={(next) => onChange('highVoltageAccessMethod', next as SiteExplorationInput['highVoltageAccessMethod'])}
              />
            </LabeledControl>
            <LabeledControl label="10kV 线路接入距离（米）">
              <Input
                type="number"
                min={0}
                max={4_294_967_295}
                step="any"
                aria-label="10kV 线路接入距离（米）"
                value={value.tenKvLineAccessDistanceMeters ?? ''}
                placeholder="填写线路接入距离"
                onChange={(event) => onChange('tenKvLineAccessDistanceMeters', optionalNumber(event.target.value))}
              />
            </LabeledControl>
          </div>
        </SurveyCardField>
      </CardContent>
    </Card>
  )
}

export function SiteExplorationPreliminaryDesignCard({
  value,
  onChange,
}: {
  value: SiteExplorationInput
  onChange: SiteExplorationSurveyDetailSetter
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{getSiteExplorationFormSection('preliminary-design').label}</CardTitle>
        <CardDescription className="mt-1">踏勘结论及充电、变压设备初步配置</CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-0">
        <SurveyCardField number={24} title="踏勘建议">
          <SingleSelect
            value={value.surveyRecommendation}
            options={[
              { value: 'priority-construction', label: '优先建设' },
              { value: 'buildable', label: '项目可建' },
              { value: 'reserve', label: '项目储备' },
              { value: 'abandon', label: '建议放弃' },
            ]}
            onChange={(next) => onChange('surveyRecommendation', next as SiteExplorationInput['surveyRecommendation'])}
          />
        </SurveyCardField>
        <SurveyCardField number={25} title="设备初步配置">
          <div className="grid gap-4">
            <LabeledControl label="充电桩型号">
              <Input aria-label="充电桩型号" maxLength={255} value={value.chargingPileModel} placeholder="填写充电桩型号" onChange={(event) => onChange('chargingPileModel', event.target.value)} />
            </LabeledControl>
            <LabeledControl label="充电桩数量">
              <Input aria-label="充电桩数量" type="number" min={0} max={4_294_967_295} step={1} value={value.chargingPileQuantity ?? ''} placeholder="填写数量" onChange={(event) => optionalInteger(event.target.value, (next) => onChange('chargingPileQuantity', next))} />
            </LabeledControl>
            <LabeledControl label="变压器容量">
              <Input aria-label="变压器容量" maxLength={255} value={value.transformerCapacity} placeholder="如：12000kVA" onChange={(event) => onChange('transformerCapacity', event.target.value)} />
            </LabeledControl>
            <LabeledControl label="变压器数量">
              <Input aria-label="变压器数量" type="number" min={0} max={4_294_967_295} step={1} value={value.transformerQuantity ?? ''} placeholder="填写数量" onChange={(event) => optionalInteger(event.target.value, (next) => onChange('transformerQuantity', next))} />
            </LabeledControl>
          </div>
        </SurveyCardField>
        <SurveyCardField number={26} title="其他备注">
          <Textarea
            aria-label="现场初步设计其他备注"
            maxLength={2000}
            value={value.preliminaryDesignNotes}
            placeholder="填写现场初步设计的其他说明"
            onChange={(event) => onChange('preliminaryDesignNotes', event.target.value)}
          />
        </SurveyCardField>
      </CardContent>
    </Card>
  )
}

function SurveyCardField({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3 border-b py-5 last:border-b-0">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{number}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  )
}

function LabeledControl({ label, children }: { label: string; children: React.ReactNode }) {
  return <Field><FieldLabel>{label}</FieldLabel>{children}</Field>
}

function SingleSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <ToggleGroup
      className="grid w-full grid-cols-1 items-stretch"
      value={value ? [value] : []}
      onValueChange={(next) => onChange(next[0] ?? '')}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} className="h-auto min-h-10 justify-start gap-2 whitespace-normal px-3 py-2 text-left" variant="outline" value={option.value}>
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input">
            <span className="size-2 rounded-full bg-primary opacity-0 group-aria-pressed/toggle:opacity-100" />
          </span>
          <span>{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function optionalNumber(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function optionalInteger(value: string, onChange: (value: number | null) => void): void {
  if (value === '') {
    onChange(null)
    return
  }
  if (!/^\d+$/u.test(value)) return
  onChange(Number(value))
}
