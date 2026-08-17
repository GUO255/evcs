import { useNavigate } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PlatformModule } from '@/features/product-shell/platform-modules'

interface ProductModulePageProps {
  module: PlatformModule
  tab: string
}

export function ProductModulePage({ module, tab }: ProductModulePageProps) {
  const navigate = useNavigate()

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{module.title}</h1>
        <p className="text-sm text-muted-foreground">{module.description}</p>
      </header>
      <Tabs
        className="gap-4"
        value={tab}
        onValueChange={(value) => {
          void navigate({
            to: module.path,
            search: { tab: value },
          })
        }}
      >
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          {module.tabs.map((item) => (
            <TabsTrigger key={item.id} value={item.id}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {module.tabs.map((item) => (
          <TabsContent key={item.id} value={item.id}>
            <div className="min-h-64 rounded-xl bg-muted/50" />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
