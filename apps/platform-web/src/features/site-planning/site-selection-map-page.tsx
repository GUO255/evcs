import { SiteSelectionMapCard } from '@/features/agent-workspace/site-selection-map-card'

export function SiteSelectionMapPage() {
  return (
    <section className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="min-h-0 flex-1">
        <SiteSelectionMapCard />
      </div>
    </section>
  )
}
