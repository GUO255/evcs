import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { RateDistributionList } from './rate-distribution-list'
import { RateTemplateList } from './rate-template-list'

export function RatePage() {
  return (
    <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">费率管理</h1>
          <p className="text-sm text-muted-foreground">配置固定或分时电价模板，并查看模板下发到充电桩的执行记录。</p>
        </header>
        <Tabs defaultValue="templates" className="gap-4">
          <TabsList variant="line" className="!h-auto flex-wrap justify-start">
            <TabsTrigger value="templates">费率模板</TabsTrigger>
            <TabsTrigger value="distributions">下发记录</TabsTrigger>
          </TabsList>
          <TabsContent value="templates"><RateTemplateList /></TabsContent>
          <TabsContent value="distributions"><RateDistributionList /></TabsContent>
        </Tabs>
    </section>
  )
}
