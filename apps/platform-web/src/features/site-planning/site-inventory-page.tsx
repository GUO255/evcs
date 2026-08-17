import { SiteInventoryDataView } from './site-inventory-data-view'

export function SiteInventoryPage() {
  return (
    <section className="flex w-full min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">任务站点</h1>
        <p className="text-sm text-muted-foreground">查看任务站点及建设任务信息。</p>
      </header>
      <SiteInventoryDataView />
    </section>
  )
}
