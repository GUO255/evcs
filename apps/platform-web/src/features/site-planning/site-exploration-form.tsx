import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useForm, useStore, type DeepKeys, type DeepValue } from '@tanstack/react-form'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Trash2Icon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type {
  SiteDistanceGeoJson,
  SiteExplorationDistanceKind,
  HighwayRoute,
  SiteExplorationImage,
  SiteExplorationInput,
  SiteExplorationRecord,
  NearbyTruckChargingStation,
} from './site-exploration-api'
import { explorationOptions } from './site-exploration-fields'
import {
  getSiteExplorationFormSection,
  siteExplorationFormSections,
  type SiteExplorationFormSectionId,
} from './site-exploration-form-sections'
import {
  createSiteExplorationCompletion,
  SiteExplorationCompletionBadge,
} from './site-exploration-completion'
import { SiteExplorationBoundaryPicker } from './site-exploration-boundary-picker'
import { SiteExplorationArterialRoadPicker } from './site-exploration-arterial-road-picker'
import { SiteExplorationArterialRoadSummary } from './site-exploration-arterial-road-summary'
import { SiteExplorationDistancePicker } from './site-exploration-distance-picker'
import { SiteExplorationExpresswayRoutePicker } from './site-exploration-expressway-route-picker'
import {
  formatHighwayDistance,
  HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS,
  isHighwayDistanceOutsideSearchRadius,
} from './site-exploration-highway-distance'
import {
  SiteExplorationAccessConvenienceImagesField,
  SiteExplorationLandSceneImagesField,
  type SiteExplorationRecordMutation,
} from './site-exploration-images'
import {
  applyConfirmedSiteExplorationLocation,
  SiteExplorationLocationPicker,
  type SiteExplorationConfirmedLocation,
} from './site-exploration-location-picker'
import {
  type NearbyChargingStation,
  SiteExplorationNearbyHotspotsDialog,
  SiteExplorationNearbyStationsDialog,
  SiteExplorationNearbyTaskStationsDialog,
} from './site-exploration-nearby-stations-dialog'
import { SiteExplorationNearbyStationSurveyDialog } from './site-exploration-nearby-station-survey-dialog'
import { SiteExplorationChargingStationIcon } from './site-exploration-charging-station-icon'
import { SiteExplorationHotspotIcon } from './site-exploration-hotspot-icon'
import { formatNearbyPlaceDistance } from './site-exploration-nearby-place-distance'
import {
  SiteExplorationPowerCard,
  SiteExplorationPreliminaryDesignCard,
  type SiteExplorationSurveyDetailSetter,
} from './site-exploration-power-design-cards'
export type SiteExplorationAutoSaveState = 'idle' | 'scheduled' | 'saving' | 'saved' | 'error'

export function SiteExplorationForm({
  initialValue,
  submitLabel,
  pending,
  record,
  mutateRecord,
  onAutoSaveStateChange,
  onSubmit,
}: {
  initialValue: SiteExplorationInput
  submitLabel: string
  pending: boolean
  record?: SiteExplorationRecord
  mutateRecord?: SiteExplorationRecordMutation
  onAutoSaveStateChange?: (state: SiteExplorationAutoSaveState) => void
  onSubmit: (value: SiteExplorationInput) => Promise<void>
}) {
  const form = useForm({
    defaultValues: initialValue,
    onSubmit: async ({ value }) => onSubmit(value),
  })
  const value = useStore(form.store, (state) => state.values)
  const formIsSubmitting = useStore(form.store, (state) => state.isSubmitting)
  const isSubmitSuccessful = useStore(form.store, (state) => state.isSubmitSuccessful)
  const submissionAttempts = useStore(form.store, (state) => state.submissionAttempts)
  const formIsDirty = useStore(form.store, (state) => state.isDirty)
  const [autoSaveScheduled, setAutoSaveScheduled] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<SiteExplorationConfirmedLocation | null>(null)
  const [activeSection, setActiveSection] = useState<SiteExplorationFormSectionId>('location')
  const sectionNavigationRef = useRef<HTMLDivElement>(null)
  const sectionTabsScrollerRef = useRef<HTMLDivElement>(null)
  const sectionElementsRef = useRef(new Map<SiteExplorationFormSectionId, HTMLElement>())
  const autoSaveScheduledRef = useRef(false)
  const autoSaveEnabled = Boolean(record)
  const isSubmitting = pending || formIsSubmitting
  const completion = createSiteExplorationCompletion(value, record?.landSceneImages.length ?? 0)
  const sectionCompletionItems: Record<SiteExplorationFormSectionId, readonly boolean[]> = {
    location: [completion.location],
    site: [
      completion.projectName,
      Boolean(value.contactName.trim() && value.contactPhone.trim()),
      completion.boundary,
    ],
    transport: [
      completion.highwayDistance,
      completion.arterialRoadDistance,
      completion.accessConvenience,
    ],
    land: [
      completion.landQualification,
      completion.landScene,
      completion.otherStructures,
      completion.groundHardening,
      completion.terrainCondition,
    ],
    supporting: [
      completion.capacity,
      completion.nearbyStations,
      completion.nearbyTaskStations,
      completion.nearbyHotspots,
      completion.cooperation,
      completion.siteMaturity,
      Boolean(value.importantNotes.trim()),
    ],
    power: [Boolean(
      value.powerAccessMethod
      && value.electricityNature
      && value.highVoltageAccessMethod
      && value.tenKvLineAccessDistanceMeters !== null
      && value.tenKvLineAccessDistanceMeters > 0,
    )],
    'preliminary-design': [
      Boolean(value.surveyRecommendation),
      Boolean(
        value.chargingPileModel.trim()
        && value.chargingPileQuantity !== null
        && value.chargingPileQuantity > 0
        && value.transformerCapacity.trim()
        && value.transformerQuantity !== null
        && value.transformerQuantity > 0,
      ),
      Boolean(value.preliminaryDesignNotes.trim()),
    ],
  }
  const hasLocationData = Boolean(
    value.longitude !== 0
    || value.latitude !== 0
    || value.locationAddress
    || value.provinceCity
    || value.countyDistrict
    || value.locationSnapshot,
  )
  const autoSaveState: SiteExplorationAutoSaveState = isSubmitting
    ? 'saving'
    : autoSaveScheduled
      ? 'scheduled'
      : submissionAttempts > 0 && !isSubmitSuccessful
        ? 'error'
        : submissionAttempts > 0
          ? 'saved'
          : 'idle'

  useEffect(() => {
    if (autoSaveEnabled) onAutoSaveStateChange?.(autoSaveState)
  }, [autoSaveEnabled, autoSaveState, onAutoSaveStateChange])

  useEffect(() => {
    if (!autoSaveEnabled || !formIsDirty) return

    autoSaveScheduledRef.current = true
    setAutoSaveScheduled(true)
    const timeoutId = window.setTimeout(() => {
      autoSaveScheduledRef.current = false
      setAutoSaveScheduled(false)
      void form.handleSubmit().catch(() => undefined)
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [autoSaveEnabled, form, formIsDirty, value])

  useEffect(() => () => {
    if (!autoSaveEnabled || !autoSaveScheduledRef.current) return
    autoSaveScheduledRef.current = false
    void form.handleSubmit().catch(() => undefined)
  }, [autoSaveEnabled, form])

  useEffect(() => {
    const firstSection = sectionElementsRef.current.get(siteExplorationFormSections[0].id)
    if (!firstSection) return
    const scrollContainer = findScrollableAncestor(firstSection)
    const visibleSections = new Set<SiteExplorationFormSectionId>()
    const sectionIdByElement = new Map(
      siteExplorationFormSections.flatMap((section) => {
        const element = sectionElementsRef.current.get(section.id)
        return element ? [[element, section.id] as const] : []
      }),
    )
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const sectionId = sectionIdByElement.get(entry.target as HTMLElement)
        if (!sectionId) continue
        if (entry.isIntersecting) visibleSections.add(sectionId)
        else visibleSections.delete(sectionId)
      }
      const nextActiveSection = siteExplorationFormSections.find(
        (section) => visibleSections.has(section.id),
      )
      if (nextActiveSection) setActiveSection(nextActiveSection.id)
    }, {
      root: scrollContainer,
      rootMargin: '-64px 0px -70% 0px',
      threshold: 0,
    })
    for (const element of sectionIdByElement.keys()) observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scroller = sectionTabsScrollerRef.current
    const activeTab = sectionNavigationRef.current?.querySelector<HTMLElement>(
      `[data-form-section-tab="${activeSection}"]`,
    )
    if (!scroller || !activeTab) return
    const targetLeft = activeTab.offsetLeft - (scroller.clientWidth - activeTab.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [activeSection])

  function set<K extends DeepKeys<SiteExplorationInput>>(key: K, next: DeepValue<SiteExplorationInput, K>) {
    form.setFieldValue(key, next)
  }

  const setSurveyDetail: SiteExplorationSurveyDetailSetter = (key, next) => {
    form.setFieldValue(key, next as never)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    void form.handleSubmit().catch(() => undefined)
  }

  function scrollToSection(sectionId: SiteExplorationFormSectionId) {
    setActiveSection(sectionId)
    const section = sectionElementsRef.current.get(sectionId)
    if (!section) return
    positionSectionAtTop(section)
  }

  function sectionRef(sectionId: SiteExplorationFormSectionId) {
    return (element: HTMLElement | null) => {
      if (element) sectionElementsRef.current.set(sectionId, element)
      else sectionElementsRef.current.delete(sectionId)
    }
  }

  function clearLocationDependentFields() {
    set('siteBoundaryGeoJson', null)
    set('siteAreaSquareMeters', 0)
    set('siteBoundarySnapshot', null)
    set('highwayDistanceMeters', 0)
    set('highwayDistanceGeoJson', null)
    set('highwayDistanceSnapshot', null)
    set('highwayEntrance', null)
    set('highwayRoutes', [])
    set('arterialRoadDistanceMeters', 0)
    set('arterialRoadDistanceGeoJson', null)
    set('arterialRoadDistanceSnapshot', null)
    set('arterialRoadTrafficGeoJson', null)
    set('nearbyTruckChargingStations', [])
    set('nearbyTruckChargingStationSnapshot', null)
    set('nearbyTaskStations', [])
    set('nearbyTaskStationSnapshot', null)
    set('nearbyHotspotAreas', [])
    set('nearbyHotspotAreaSnapshot', null)
  }

  function applySelectedLocation(
    selected: SiteExplorationConfirmedLocation,
    shouldClearDependentFields: boolean,
  ) {
    if (shouldClearDependentFields) clearLocationDependentFields()
    const next = applyConfirmedSiteExplorationLocation(value, selected)
    set('longitude', next.longitude)
    set('latitude', next.latitude)
    set('locationSnapshot', next.locationSnapshot)
    set('locationAddress', next.locationAddress)
    set('provinceCity', next.provinceCity)
    set('countyDistrict', next.countyDistrict)
    set('projectName', next.projectName)
    setPendingLocation(null)
  }

  function clearLocation() {
    clearLocationDependentFields()
    set('longitude', 0)
    set('latitude', 0)
    set('locationAddress', '')
    set('provinceCity', '')
    set('countyDistrict', '')
    set('locationSnapshot', null)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 pb-[200px]">
      <Tabs
        value={activeSection}
        onValueChange={(next) => scrollToSection(next as SiteExplorationFormSectionId)}
        className="gap-6"
      >
        <div
          ref={sectionNavigationRef}
          className="sticky top-0 z-20 rounded-xl border bg-background/95 shadow-sm backdrop-blur"
        >
          <div
            ref={sectionTabsScrollerRef}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent overflow-x-auto"
          >
            <TabsList
              className="!h-12 w-full min-w-max justify-center gap-1 bg-transparent px-4 py-2"
              aria-label="勘探表单卡片导航"
            >
              {siteExplorationFormSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  data-form-section-tab={section.id}
                  className="px-3 data-active:bg-muted data-active:shadow-none"
                  onClick={() => {
                    if (activeSection === section.id) scrollToSection(section.id)
                  }}
                >
                  <span>{section.label}</span>
                  <SiteExplorationCompletionBadge
                    items={sectionCompletionItems[section.id]}
                    neutralWhenIncomplete
                  />
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

      <section ref={sectionRef('location')} className="scroll-mt-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{getSiteExplorationFormSection('location').label}</CardTitle>
              <CardDescription className="mt-1">项目地理位置、行政区划与坐标信息</CardDescription>
            </div>
            <SiteExplorationCompletionBadge items={[completion.location]} optional />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-0">
          <BasicField number={1} title="项目的地理位置" completed={completion.location}>
            <MeasurementSnapshotPreview
              snapshot={value.locationSnapshot}
              title="位置地图截图"
              description="地图截图已保存到当前表单"
            />
            <LocationSummary value={value} />
            <div className="mt-2 flex flex-wrap items-center justify-start gap-2">
              <SiteExplorationLocationPicker
                longitude={value.longitude}
                latitude={value.latitude}
                locationAddress={value.locationAddress}
                disabled={isSubmitting}
                onSelect={(selected) => {
                  if (hasLocationData && !hasSameCoordinates(value, selected)) {
                    setPendingLocation(selected)
                  } else {
                    applySelectedLocation(selected, false)
                  }
                }}
              />
              {hasLocationData ? (
                <MeasurementClearDialog
                  title="清除项目位置？"
                  description="将清除项目地址、行政区划、坐标和位置地图截图，清除后表单会自动保存。"
                  disabled={isSubmitting}
                  onClear={clearLocation}
                />
              ) : null}
            </div>
            <AlertDialog open={pendingLocation !== null} onOpenChange={() => undefined}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>是否清理原位置相关数据？</AlertDialogTitle>
                  <AlertDialogDescription>
                    清理后将移除卫星测绘、两项道路测距、5 公里内充电站及热点区域的结果和截图。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => {
                      if (pendingLocation) applySelectedLocation(pendingLocation, false)
                    }}
                  >
                    否，保留
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (pendingLocation) applySelectedLocation(pendingLocation, true)
                    }}
                  >
                    是，清理
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </BasicField>
        </CardContent>
      </Card>
      </section>

      <section ref={sectionRef('site')} className="scroll-mt-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{getSiteExplorationFormSection('site').label}</CardTitle>
              <CardDescription className="mt-1">项目、场地面积与现场基础资料</CardDescription>
            </div>
            <SiteExplorationCompletionBadge items={[completion.projectName, completion.boundary]} optional />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-0">
          <BasicField number={2} title="项目名称" completed={completion.projectName} description="命名规则：地市 + 县（区）+ 重卡充电站项目">
            <Input aria-label="项目名称" value={value.projectName} onChange={(event) => set('projectName', event.target.value)} />
          </BasicField>
          <BasicField number={3} title="场站联系人及电话" description="联系人和联系电话均为可选项" optional>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input aria-label="场站联系人（可选）" value={value.contactName} placeholder="联系人（可选）" onChange={(event) => set('contactName', event.target.value)} />
              <Input aria-label="联系电话（可选）" type="tel" value={value.contactPhone} placeholder="联系电话（可选）" onChange={(event) => set('contactPhone', event.target.value)} />
            </div>
          </BasicField>
          <BasicField number={4} title="场站位置卫星图和场站面积" completed={completion.boundary}>
            <BoundaryField
              areaSquareMeters={value.siteAreaSquareMeters}
              boundary={value.siteBoundaryGeoJson}
              snapshot={value.siteBoundarySnapshot}
              longitude={value.longitude}
              latitude={value.latitude}
              disabled={isSubmitting}
              onSelect={(siteBoundaryGeoJson, siteAreaSquareMeters, siteBoundarySnapshot) => {
                set('siteBoundaryGeoJson', siteBoundaryGeoJson)
                set('siteAreaSquareMeters', siteAreaSquareMeters)
                set('siteBoundarySnapshot', siteBoundarySnapshot)
              }}
              onClear={() => {
                set('siteBoundaryGeoJson', null)
                set('siteAreaSquareMeters', 0)
                set('siteBoundarySnapshot', null)
              }}
            />
          </BasicField>
        </CardContent>
      </Card>
      </section>

      <section ref={sectionRef('transport')} className="scroll-mt-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{getSiteExplorationFormSection('transport').label}</CardTitle>
              <CardDescription className="mt-1">道路距离与进出条件</CardDescription>
            </div>
            <SiteExplorationCompletionBadge items={[completion.highwayDistance, completion.arterialRoadDistance, completion.accessConvenience]} optional />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-0">
          <BasicField number={5} title="距离高速口距离" completed={completion.highwayDistance}>
            <ExpresswayRouteField
              value={value.highwayDistanceMeters}
              geoJson={value.highwayDistanceGeoJson}
              snapshot={value.highwayDistanceSnapshot}
              routes={value.highwayRoutes}
              longitude={value.longitude}
              latitude={value.latitude}
              disabled={isSubmitting}
              onSelect={(snapshot, routes) => {
                const primary = routes[0]!
                set('highwayDistanceMeters', primary.drivingDistanceMeters)
                set('highwayDistanceGeoJson', primary.geoJson)
                set('highwayDistanceSnapshot', snapshot)
                set('highwayEntrance', {
                  poiId: primary.poiId, name: primary.name, address: primary.address,
                  longitude: primary.longitude, latitude: primary.latitude,
                })
                set('highwayRoutes', routes)
              }}
              onOutsideSearchRadius={() => {
                set('highwayDistanceMeters', HIGHWAY_DISTANCE_OUTSIDE_SEARCH_RADIUS_METERS)
                set('highwayDistanceGeoJson', null)
                set('highwayDistanceSnapshot', null)
                set('highwayEntrance', null)
                set('highwayRoutes', [])
              }}
              onClear={() => {
                set('highwayDistanceMeters', 0)
                set('highwayDistanceGeoJson', null)
                set('highwayDistanceSnapshot', null)
                set('highwayEntrance', null)
                set('highwayRoutes', [])
              }}
            />
          </BasicField>
          <BasicField number={6} title="场站离国/省/主干道通道距离与车流" completed={completion.arterialRoadDistance}>
            <DistanceField
              value={value.arterialRoadDistanceMeters}
              kind="arterial-road-distance"
              geoJson={value.arterialRoadDistanceGeoJson}
              snapshot={value.arterialRoadDistanceSnapshot}
              title="场站离国/省/主干道通道距离与车流"
              result={value.arterialRoadTrafficGeoJson ? (
                <SiteExplorationArterialRoadSummary
                  trafficGeoJson={value.arterialRoadTrafficGeoJson}
                />
              ) : undefined}
              longitude={value.longitude}
              latitude={value.latitude}
              disabled={isSubmitting}
              picker={(
                <SiteExplorationArterialRoadPicker
                  longitude={value.longitude}
                  latitude={value.latitude}
                  disabled={isSubmitting}
                  onSelect={(distanceMeters, geoJson, snapshot, trafficGeoJson) => {
                    set('arterialRoadDistanceMeters', distanceMeters)
                    set('arterialRoadDistanceGeoJson', geoJson)
                    set('arterialRoadDistanceSnapshot', snapshot)
                    set('arterialRoadTrafficGeoJson', trafficGeoJson)
                  }}
                />
              )}
              onSelect={() => undefined}
              onClear={() => {
                set('arterialRoadDistanceMeters', 0)
                set('arterialRoadDistanceGeoJson', null)
                set('arterialRoadDistanceSnapshot', null)
                set('arterialRoadTrafficGeoJson', null)
              }}
            />
          </BasicField>
          <BasicField number={7} title="进出便利性（场站与主干道距离及进出通畅性）" completed={completion.accessConvenience}>
            <AccessConvenienceToggle
              value={value.accessConvenience}
              onChange={(next) => set('accessConvenience', next)}
            />
            <div className="mt-4">
              {record && mutateRecord ? (
                <SiteExplorationAccessConvenienceImagesField
                  record={record}
                  mutateRecord={mutateRecord}
                />
              ) : (
                <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                  创建站点后可上传进出便利性现场图片。
                </p>
              )}
            </div>
          </BasicField>
        </CardContent>
      </Card>
      </section>

      <section ref={sectionRef('land')} className="scroll-mt-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{getSiteExplorationFormSection('land').label}</CardTitle>
              <CardDescription className="mt-1">土地证明、现场条件与附属物</CardDescription>
            </div>
            <SiteExplorationCompletionBadge items={[completion.landQualification, completion.landScene, completion.otherStructures, completion.groundHardening, completion.terrainCondition]} optional />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-0">
          <BasicField
            number={8}
            title="土地性质是否满足充换电站建设要求"
            completed={completion.landQualification}
            description="建设用地：商业服务业用地、工业用地、物流仓储用地、货运枢纽配套用地、矿山配套建设用地、交通配套用地。集体经营性用地：依法入市的集体经营性建设用地、农村集体建设用地。划拨用地：交通基础设施配套划拨用地，不改变划拨用途。"
          >
            <BooleanChoice
              value={value.landQualified}
              onChange={(checked) => {
                set('landQualified', checked)
                if (!checked) {
                  set('landType', '')
                  set('landTypeDescription', '')
                  set('hasLandProof', false)
                  set('hasLeaseAgreement', false)
                }
              }}
            />
            {value.landQualified ? (
              <div className="mt-4 rounded-lg bg-muted/25 px-4">
                <SubField
                  number="8.1"
                  title="站点土地性质"
                  completed={Boolean(value.landType && (value.landType !== 'other' || value.landTypeDescription.trim()))}
                >
                  <OptionToggleGroup
                    value={value.landType}
                    options={landTypeOptions}
                    onChange={(next) => {
                      set('landType', next as SiteExplorationInput['landType'])
                      if (next !== 'other') set('landTypeDescription', '')
                    }}
                  />
                  {value.landType === 'other' ? <div className="mt-4"><TextField label="其他土地性质说明" value={value.landTypeDescription} onChange={(next) => set('landTypeDescription', next)} /></div> : null}
                </SubField>
                <SubField
                  number="8.2"
                  title="土地证明材料"
                  description="《国有土地使用证》或《不动产权证书》、《建设用地规划许可证》，并附带带有精确地理坐标的场地红线图。"
                  completed
                >
                  <BooleanChoice value={value.hasLandProof} yesLabel="有土地证明材料" noLabel="无土地证明材料" onChange={(next) => set('hasLandProof', next)} />
                </SubField>
                <SubField
                  number="8.3"
                  title="土地租赁协议"
                  description="合作方承租土地，须提供与土地产权方签订的完整场地租赁协议，权利链条完整、闭环，并取得产权方同意。"
                  completed
                >
                  <BooleanChoice value={value.hasLeaseAgreement} yesLabel="有土地租赁协议" noLabel="无土地租赁协议" onChange={(next) => set('hasLeaseAgreement', next)} />
                </SubField>
              </div>
            ) : null}
          </BasicField>
          <BasicField number={12} title="现场土地情况" completed={completion.landScene}>
            {record && mutateRecord ? (
              <SiteExplorationLandSceneImagesField record={record} mutateRecord={mutateRecord} />
            ) : (
              <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                创建站点后可上传现场土地图片。
              </p>
            )}
          </BasicField>
          <BasicField number={13} title="是否有其他附属物" completed={completion.otherStructures}>
            <BooleanChoice value={value.hasOtherStructures} onChange={(next) => set('hasOtherStructures', next)} />
          </BasicField>
          <BasicField number={14} title="地面硬化条件" completed={completion.groundHardening}>
            <OptionToggleGroup
              value={value.groundHardening}
              options={groundHardeningOptions}
              onChange={(next) => set('groundHardening', next as SiteExplorationInput['groundHardening'])}
            />
          </BasicField>
          <BasicField number={15} title="土地地势情况" completed={completion.terrainCondition}>
            <OptionToggleGroup
              value={value.terrainCondition}
              options={terrainConditionOptions}
              onChange={(next) => set('terrainCondition', next as SiteExplorationInput['terrainCondition'])}
            />
          </BasicField>
        </CardContent>
      </Card>
      </section>

      <section ref={sectionRef('supporting')} className="scroll-mt-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{getSiteExplorationFormSection('supporting').label}</CardTitle>
              <CardDescription className="mt-1">容量、周边市场、合作与成熟度</CardDescription>
            </div>
            <SiteExplorationCompletionBadge items={[completion.capacity, completion.nearbyStations, completion.nearbyTaskStations, completion.nearbyHotspots, completion.cooperation, completion.siteMaturity]} optional />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-0">
          <BasicField
            number={16}
            title="容量情况"
            completed={completion.capacity}
            description="周边是否有接入点，距离接入点距离大致估算一下。"
          >
            <Textarea
              aria-label="容量情况"
              value={value.capacityDescription}
              placeholder="填写周边是否有接入点、接入点位置及大致距离"
              onChange={(event) => set('capacityDescription', event.target.value)}
            />
          </BasicField>
          <BasicField number={17} title="周边（5公里内）新能源重卡充电站" completed={completion.nearbyStations}>
            <MeasurementSnapshotPreview
              snapshot={value.nearbyTruckChargingStationSnapshot}
              title="附近重卡充电站地图"
              description="5 公里范围、当前站点与充电站点位已保存到当前表单"
            />
            {value.nearbyTruckChargingStations.length ? (
              <ol className="mb-3 divide-y rounded-lg border bg-muted/20 px-3">
                {value.nearbyTruckChargingStations.map((station) => (
                  <li key={station.sequence} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5"><SiteExplorationChargingStationIcon /></span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="block font-medium">{station.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatNearbyPlaceDistance(value, station)}
                      </span>
                      {formatNearbyStationSurvey(station) ? (
                        <span className="block whitespace-pre-wrap text-xs text-muted-foreground">
                          {formatNearbyStationSurvey(station)}
                        </span>
                      ) : null}
                    </span>
                    <SiteExplorationNearbyStationSurveyDialog
                      station={station}
                      onSave={(updatedStation) => set(
                        'nearbyTruckChargingStations',
                        value.nearbyTruckChargingStations.map((current) => current.sequence === station.sequence ? updatedStation : current),
                      )}
                    />
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <SiteExplorationNearbyStationsDialog
                longitude={value.longitude}
                latitude={value.latitude}
                locationAddress={value.locationAddress}
                initialPlaces={value.nearbyTruckChargingStations}
                onConfirm={(stations, snapshot) => {
                  set('nearbyTruckChargingStations', mergeNearbyStationSurveys(stations, value.nearbyTruckChargingStations))
                  set('nearbyTruckChargingStationSnapshot', snapshot)
                }}
              />
              {value.nearbyTruckChargingStationSnapshot || value.nearbyTruckChargingStations.length ? (
                <MeasurementClearDialog
                  title="清除附近重卡充电站查询结果？"
                  description="将清除附近站点列表和地图截图，清除后表单会自动保存。"
                  disabled={isSubmitting}
                  onClear={() => {
                    set('nearbyTruckChargingStations', [])
                    set('nearbyTruckChargingStationSnapshot', null)
                  }}
                />
              ) : null}
            </div>
          </BasicField>
          <BasicField number={18} title="周边（5公里内）任务站点" completed={completion.nearbyTaskStations}>
            <MeasurementSnapshotPreview
              snapshot={value.nearbyTaskStationSnapshot}
              title="周边任务站点地图"
              description="5 公里范围、当前站点与任务站点位已保存到当前表单"
            />
            {value.nearbyTaskStations.length ? (
              <ol className="mb-3 divide-y rounded-lg border bg-muted/20 px-3">
                {value.nearbyTaskStations.map((station) => (
                  <li key={station.id} className="flex items-start gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{station.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[formatNearbyPlaceDistance(value, station), station.address].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <SiteExplorationNearbyTaskStationsDialog
                longitude={value.longitude}
                latitude={value.latitude}
                locationAddress={value.locationAddress}
                initialPlaces={value.nearbyTaskStations}
                onConfirm={(stations, snapshot) => {
                  set('nearbyTaskStations', stations)
                  set('nearbyTaskStationSnapshot', snapshot)
                }}
              />
              {value.nearbyTaskStationSnapshot || value.nearbyTaskStations.length ? (
                <MeasurementClearDialog
                  title="清除周边任务站点查询结果？"
                  description="将清除任务站点列表和地图截图，清除后表单会自动保存。"
                  disabled={isSubmitting}
                  onClear={() => {
                    set('nearbyTaskStations', [])
                    set('nearbyTaskStationSnapshot', null)
                  }}
                />
              ) : null}
            </div>
          </BasicField>
          <BasicField number={19} title="周边（5公里内）热点区域" completed={completion.nearbyHotspots}>
            <MeasurementSnapshotPreview
              snapshot={value.nearbyHotspotAreaSnapshot}
              title="周边热点区域地图"
              description="5 公里范围、当前站点与热点区域点位已保存到当前表单"
            />
            {value.nearbyHotspotAreas.length ? (
              <ol className="mb-3 divide-y rounded-lg border bg-muted/20 px-3">
                {value.nearbyHotspotAreas.map((hotspot) => (
                  <li key={hotspot.sequence} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5"><SiteExplorationHotspotIcon category={hotspot.category} /></span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="block font-medium">{hotspot.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[hotspot.category, formatNearbyPlaceDistance(value, hotspot)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <SiteExplorationNearbyHotspotsDialog
                longitude={value.longitude}
                latitude={value.latitude}
                locationAddress={value.locationAddress}
                initialPlaces={value.nearbyHotspotAreas}
                onConfirm={(hotspots, snapshot) => {
                  set('nearbyHotspotAreas', hotspots)
                  set('nearbyHotspotAreaSnapshot', snapshot)
                }}
              />
              {value.nearbyHotspotAreaSnapshot || value.nearbyHotspotAreas.length ? (
                <MeasurementClearDialog
                  title="清除周边热点区域查询结果？"
                  description="将清除热点区域列表和地图截图，清除后表单会自动保存。"
                  disabled={isSubmitting}
                  onClear={() => {
                    set('nearbyHotspotAreas', [])
                    set('nearbyHotspotAreaSnapshot', null)
                  }}
                />
              ) : null}
            </div>
          </BasicField>
          <BasicField number={20} title="合作模式" completed={completion.cooperation} description="在填写部分填写分成比例。">
            <OptionToggleGroup
              value={value.cooperationMode}
              options={cooperationModeOptions}
              onChange={(next) => set('cooperationMode', next as SiteExplorationInput['cooperationMode'])}
            />
            {value.cooperationMode ? (
              <Textarea
                className="mt-3"
                aria-label="合作条件"
                value={value.cooperationTerms}
                placeholder="填写合作条件或分成比例"
                onChange={(event) => set('cooperationTerms', event.target.value)}
              />
            ) : null}
          </BasicField>
          <BasicField
            number={21}
            title="场站成熟度"
            completed={completion.siteMaturity}
            description="A/B/C类场站优先级。"
          >
            <OptionToggleGroup
              value={value.siteMaturity}
              options={siteMaturityOptions}
              onChange={(next) => set('siteMaturity', next as SiteExplorationInput['siteMaturity'])}
            />
          </BasicField>
          <BasicField number={22} title="其他重要事项" optional>
            <Textarea
              aria-label="其他重要事项"
              value={value.importantNotes}
              placeholder="可填写其他重要事项"
              onChange={(event) => set('importantNotes', event.target.value)}
            />
          </BasicField>
        </CardContent>
      </Card>
      </section>

      <section ref={sectionRef('power')} className="scroll-mt-16">
        <SiteExplorationPowerCard value={value} onChange={setSurveyDetail} />
      </section>
      <section ref={sectionRef('preliminary-design')} className="scroll-mt-16">
        <SiteExplorationPreliminaryDesignCard value={value} onChange={setSurveyDetail} />
      </section>

      </Tabs>

      {!autoSaveEnabled ? (
        <div className="sticky bottom-4 flex justify-end rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '正在保存…' : submitLabel}</Button>
        </div>
      ) : null}
    </form>
  )
}

function findScrollableAncestor(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement
  while (current && current !== document.body) {
    const overflowY = window.getComputedStyle(current).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current
    }
    current = current.parentElement
  }
  return null
}

function positionSectionAtTop(section: HTMLElement): void {
  const scrollContainer = findScrollableAncestor(section)
  const sectionTop = section.getBoundingClientRect().top
  const stickyNavigationOffset = 64
  const start = scrollContainer ? scrollContainer.scrollTop : window.scrollY
  const target = scrollContainer
    ? start + sectionTop - scrollContainer.getBoundingClientRect().top - stickyNavigationOffset
    : start + sectionTop - stickyNavigationOffset
  const maximum = scrollContainer
    ? scrollContainer.scrollHeight - scrollContainer.clientHeight
    : document.documentElement.scrollHeight - window.innerHeight
  const boundedTarget = Math.max(0, Math.min(target, maximum))
  if (scrollContainer) scrollContainer.scrollTop = boundedTarget
  else window.scrollTo({ top: boundedTarget })
}

function mergeNearbyStationSurveys(
  stations: readonly NearbyChargingStation[],
  savedStations: readonly NearbyTruckChargingStation[],
): NearbyTruckChargingStation[] {
  return stations.map((station) => {
    const saved = savedStations.find((candidate) => (
      station.id && candidate.id === station.id
    )) ?? savedStations.find((candidate) => (
      candidate.name === station.name && candidate.address === station.address
    ))
    return {
      ...station,
      surveyScale: saved?.surveyScale ?? '',
      surveyModelQuantity: saved?.surveyModelQuantity ?? '',
      surveyUtilizationRate: saved?.surveyUtilizationRate ?? '',
      surveyElectricityPrice: saved?.surveyElectricityPrice ?? '',
    }
  })
}

function formatNearbyStationSurvey(station: NearbyTruckChargingStation): string {
  return [
    station.surveyScale.trim() ? `规模：${station.surveyScale.trim()}` : '',
    station.surveyModelQuantity.trim() ? `型号/数量：${station.surveyModelQuantity.trim()}` : '',
    station.surveyUtilizationRate ? `使用率：${station.surveyUtilizationRate}` : '',
    station.surveyElectricityPrice.trim() ? `电费：${station.surveyElectricityPrice.trim()}` : '',
  ].filter(Boolean).join('；')
}

function hasSameCoordinates(
  current: Pick<SiteExplorationInput, 'longitude' | 'latitude'>,
  selected: Pick<SiteExplorationConfirmedLocation, 'longitude' | 'latitude'>,
): boolean {
  return roundCoordinate(current.longitude) === roundCoordinate(selected.longitude)
    && roundCoordinate(current.latitude) === roundCoordinate(selected.latitude)
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function BoundaryField({
  areaSquareMeters,
  boundary,
  snapshot,
  longitude,
  latitude,
  disabled,
  onSelect,
  onClear,
}: {
  areaSquareMeters: number
  boundary: SiteExplorationInput['siteBoundaryGeoJson']
  snapshot: SiteExplorationImage | null
  longitude: number
  latitude: number
  disabled: boolean
  onSelect: Parameters<typeof SiteExplorationBoundaryPicker>[0]['onSelect']
  onClear: () => void
}) {
  const hasMeasurement = areaSquareMeters > 0 || boundary !== null || snapshot !== null
  return (
    <div className="flex flex-col gap-2">
      <MeasurementSnapshotPreview
        snapshot={snapshot}
        title="边界测绘截图"
        description="截图 URL 与边界 GeoJSON 已保存到当前表单"
      />
      <MeasurementResult
        label="场站面积"
        value={areaSquareMeters > 0
          ? `约 ${formatSquareMetersAsMu(areaSquareMeters)} 亩（${areaSquareMeters.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 平方米）`
          : '尚未测绘'}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SiteExplorationBoundaryPicker
          longitude={longitude}
          latitude={latitude}
          initialBoundary={boundary}
          disabled={disabled}
          onSelect={onSelect}
        />
        {hasMeasurement ? (
          <MeasurementClearDialog
            title="清除场站测绘结果？"
            description="将清除场站面积、边界 GeoJSON 和地图截图，清除后表单会自动保存。"
            disabled={disabled}
            onClear={onClear}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {hasMeasurement ? '测绘结果已回填并将自动保存。' : '请使用卫星测绘获取场站边界和面积。'}
      </p>
    </div>
  )
}

function ExpresswayRouteField({
  value,
  geoJson,
  snapshot,
  routes,
  longitude,
  latitude,
  disabled,
  onSelect,
  onOutsideSearchRadius,
  onClear,
}: {
  value: number
  geoJson: SiteDistanceGeoJson | null
  snapshot: SiteExplorationImage | null
  routes: HighwayRoute[]
  longitude: number
  latitude: number
  disabled: boolean
  onSelect: (snapshot: SiteExplorationImage, routes: HighwayRoute[]) => void
  onOutsideSearchRadius: () => void
  onClear: () => void
}) {
  const outsideSearchRadius = isHighwayDistanceOutsideSearchRadius(value, geoJson, snapshot)
  const hasMeasurement = outsideSearchRadius || Boolean(value > 0 && geoJson !== null && snapshot !== null)
  return (
    <div className="flex flex-col gap-2">
      <MeasurementSnapshotPreview
        snapshot={snapshot}
        title="最近高速口驾车路线截图"
        description="路线截图和 WGS84 路线 GeoJSON 已保存到当前表单"
      />
      <MeasurementResult
        label="距离高速口距离"
        value={formatHighwayDistance(value, geoJson, snapshot) || '尚未查询'}
      />
      {routes.length > 0 ? (
        <div className="divide-y rounded-lg border bg-muted/30 px-4">
          {routes.map((route, index) => (
            <div key={route.poiId} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div><span className="mr-2 font-medium">{index + 1}.</span><span className="font-medium">{route.name}</span><p className="pl-5 text-xs text-muted-foreground">{route.address}</p></div>
              <span className="pl-5 text-sm tabular-nums text-muted-foreground sm:pl-0">驾车 {formatHighwayDistance(route.drivingDistanceMeters, route.geoJson, snapshot)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <SiteExplorationExpresswayRoutePicker
          longitude={longitude}
          latitude={latitude}
          initialGeoJson={geoJson}
          initialRoutes={routes}
          hasSavedResult={hasMeasurement}
          disabled={disabled}
          onSelect={onSelect}
          onOutsideSearchRadius={onOutsideSearchRadius}
        />
        {hasMeasurement ? (
          <MeasurementClearDialog
            title="清除最近高速口路线？"
            description="将清除驾车距离、路线 GeoJSON 和地图截图，清除后表单会自动保存。"
            disabled={disabled}
            onClear={onClear}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {outsideSearchRadius
          ? '已回填为 20 公里范围外；可重新查询或清除。'
          : hasMeasurement
            ? '高速口及驾车路线已回填并将自动保存。'
          : '系统将查询 20 公里内直线距离最近的 3 个高速出入口。'}
      </p>
    </div>
  )
}

function DistanceField({
  value,
  kind,
  geoJson,
  snapshot,
  title,
  result,
  longitude,
  latitude,
  disabled,
  onSelect,
  onClear,
  picker,
}: {
  value: number
  kind: SiteExplorationDistanceKind
  geoJson: SiteDistanceGeoJson | null
  snapshot: SiteExplorationImage | null
  title: string
  result?: ReactNode
  longitude: number
  latitude: number
  disabled: boolean
  onSelect: (
    value: number,
    geoJson: SiteDistanceGeoJson,
    snapshot: SiteExplorationImage,
  ) => void
  onClear: () => void
  picker?: ReactNode
}) {
  const hasMeasurement = value > 0 || geoJson !== null || snapshot !== null
  return (
    <div className="flex flex-col gap-2">
      <MeasurementSnapshotPreview
        snapshot={snapshot}
        title={`${title}截图`}
        description="截图 URL 与路线 GeoJSON 已保存到当前表单"
      />
      {result ?? (
        <MeasurementResult
          label={title}
          value={value > 0 ? `约 ${value.toLocaleString('zh-CN')} 米` : '尚未测距'}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {picker ?? (
          <SiteExplorationDistancePicker
            title={title}
            kind={kind}
            longitude={longitude}
            latitude={latitude}
            initialGeoJson={geoJson}
            disabled={disabled}
            onSelect={onSelect}
          />
        )}
        {hasMeasurement ? (
          <MeasurementClearDialog
            title="清除此项测距结果？"
            description="将清除距离、路线 GeoJSON 和地图截图，清除后表单会自动保存。"
            disabled={disabled}
            onClear={onClear}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {picker
          ? value > 0
            ? '距离、车流路段与截图已回填并将自动保存。'
            : '请自动分析道路距离与路段车流。'
          : value > 0
            ? '测距结果已回填并将自动保存。'
            : '请使用地图测距获取道路距离。'}
      </p>
    </div>
  )
}

function MeasurementResult({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5" aria-label={label}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}

function MeasurementClearDialog({
  title,
  description,
  disabled,
  onClear,
}: {
  title: string
  description: string
  disabled: boolean
  onClear: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="outline" disabled={disabled} />}
      >
        <Trash2Icon aria-hidden="true" />
        清除
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onClear}>确认清除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MeasurementSnapshotPreview({
  snapshot,
  title,
  description,
}: {
  snapshot: SiteExplorationImage | null
  title: string
  description: string
}) {
  const [open, setOpen] = useState(false)
  if (!snapshot) return null

  return (
    <>
      <figure className="mb-1 flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
        <Button
          type="button"
          variant="outline"
          className="size-20 shrink-0 overflow-hidden p-0"
          aria-label={`预览${title}`}
          onClick={() => setOpen(true)}
        >
          <img src={snapshot.url} alt={title} className="size-full object-cover" />
        </Button>
        <figcaption className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </figcaption>
      </figure>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <img src={snapshot.url} alt={title} className="max-h-[70dvh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}

const accessConvenienceOptions = [
  { value: 'excellent', label: '便利性很好（从主干道无需绕行进入）' },
  { value: 'good', label: '便利性较好（从主干道简单绕行进入）' },
  { value: 'average', label: '便利性一般（从主干道复杂绕行进入）' },
] as const

const groundHardeningOptions = [
  { value: 'good', label: '地面硬化较好，无需硬化' },
  { value: 'needs-hardening', label: '地面硬化一般，需要硬化' },
  { value: 'unhardened', label: '地面无硬化' },
] as const

const terrainConditionOptions = [
  { value: 'well-drained', label: '地势较高不积水/有良好排水' },
  { value: 'flat', label: '地势平坦不易积水' },
  { value: 'low-lying', label: '地势低洼易积水' },
] as const

const cooperationModeOptions = [
  { value: 'service-fee-share', label: '服务费分成' },
  { value: 'net-profit-share', label: '场站净利润分成' },
  { value: 'fixed-rent', label: '固定租金' },
] as const

const siteMaturityOptions = [
  { value: 'a', label: 'A类站点：可立刻签约合同' },
  { value: 'b', label: 'B类站点：场站位置非常好，但欠缺合同签约条件' },
  { value: 'c', label: 'C类站点：储备站点' },
] as const

const landTypeOptions = explorationOptions.landType.filter((option) => option.value)

function AccessConvenienceToggle({
  value,
  onChange,
}: {
  value: SiteExplorationInput['accessConvenience']
  onChange: (value: SiteExplorationInput['accessConvenience']) => void
}) {
  return (
    <OptionToggleGroup
      value={value}
      options={accessConvenienceOptions}
      onChange={(next) => onChange(next as SiteExplorationInput['accessConvenience'])}
    />
  )
}

function BooleanChoice({
  value,
  yesLabel = '是',
  noLabel = '否',
  onChange,
}: {
  value: boolean
  yesLabel?: string
  noLabel?: string
  onChange: (value: boolean) => void
}) {
  return (
    <OptionToggleGroup
      value={value ? 'yes' : 'no'}
      options={[
        { value: 'yes', label: yesLabel },
        { value: 'no', label: noLabel },
      ]}
      onChange={(next) => onChange(next === 'yes')}
    />
  )
}

function OptionToggleGroup({
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
      className="w-full items-stretch"
      orientation="vertical"
      value={value ? [value] : []}
      onValueChange={(next) => {
        const selected = next[0]
        if (selected) onChange(selected)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          className="h-auto w-full justify-start gap-3 whitespace-normal px-4 py-3 text-left"
          variant="outline"
          value={option.value}
        >
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-input">
            <span className="size-2 rounded-full bg-primary opacity-0 group-aria-pressed/toggle:opacity-100" />
          </span>
          <span>{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function BasicField({
  number,
  title,
  description,
  completed = false,
  optional = true,
  children,
}: {
  number: number | string
  title: string
  description?: string
  completed?: boolean
  optional?: boolean
  children: ReactNode
}) {
  return (
    <section className="flex gap-3 border-b py-5 last:border-b-0">
      <FieldSequence number={number} completed={completed} optional={optional} />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-3">{children}</div>
      </div>
    </section>
  )
}

function SubField({
  number,
  title,
  description,
  completed,
  children,
}: {
  number: string
  title: string
  description?: string
  completed: boolean
  children: ReactNode
}) {
  return (
    <section className="flex gap-3 border-b py-4 last:border-b-0">
      <FieldSequence number={number} completed={completed} optional />
      <div className="min-w-0 flex-1">
        <h4 className="font-medium">{title}</h4>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-3">{children}</div>
      </div>
    </section>
  )
}

function FieldSequence({
  number,
  completed,
  optional = false,
}: {
  number: number | string
  completed: boolean
  optional?: boolean
}) {
  return (
    <span className={completed
      ? 'flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-sm font-medium text-primary-foreground'
      : optional
        ? 'flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-sm font-medium text-secondary-foreground'
      : 'flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-sm font-medium text-destructive-foreground'}>
      {number}
    </span>
  )
}

function LocationSummary({ value }: { value: SiteExplorationInput }) {
  const hasLocation = value.longitude !== 0 || value.latitude !== 0

  return (
    <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-xl bg-muted/35 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">位置</dt>
        <dd className="mt-1 break-words font-medium">{value.locationAddress || '尚未选择位置'}</dd>
      </div>
      <ReadOnlyLocationItem label="省辖市" value={value.provinceCity || '—'} />
      <ReadOnlyLocationItem label="所在县（区）" value={value.countyDistrict || '—'} />
      <ReadOnlyLocationItem
        label="经纬度"
        value={hasLocation ? `${value.longitude.toFixed(6)}, ${value.latitude.toFixed(6)}` : '—'}
        className="sm:col-span-2"
        tabular
      />
    </dl>
  )
}

function ReadOnlyLocationItem({
  label,
  value,
  className,
  tabular = false,
}: {
  label: string
  value: string
  className?: string
  tabular?: boolean
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-medium${tabular ? ' tabular-nums' : ''}`}>{value}</dd>
    </div>
  )
}

function formatSquareMetersAsMu(squareMeters: number): string {
  return (squareMeters * 3 / 2_000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function TextField({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <Field><FieldLabel>{label}</FieldLabel><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></Field>
}
