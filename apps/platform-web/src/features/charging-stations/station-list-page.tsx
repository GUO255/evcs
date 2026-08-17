import { useState } from 'react'
import { PlusIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'

import { StationDataTable } from './station-data-table'
import { StationFormDialog } from './station-form-dialog'
import { useStations } from './station-store'

export function StationListPage() {
  const { stations } = useStations()
  const [formOpen, setFormOpen] = useState(false)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">充电站管理</h1>
          <p className="text-sm text-muted-foreground">查询场站资料、光储充设备、配套设施及运营归属。</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          新增站点
        </Button>
      </header>

      <StationDataTable stations={stations} />
      <StationFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </section>
  )
}
