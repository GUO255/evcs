import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { getMerchantSettlementRecords } from './settlement-data'
import { SettlementRecords } from './settlement-records'
import { SettlementMetrics, SettlementStatistics } from './settlement-statistics'

export function SettlementPage() {
  const records = getMerchantSettlementRecords()
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">商户结算</h1>
        <p className="text-sm text-muted-foreground">查看商户结算记录、资金状态和结算统计。</p>
      </header>

      <SettlementMetrics records={records} />

      <Tabs defaultValue="records" className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          <TabsTrigger value="records">结算记录</TabsTrigger>
          <TabsTrigger value="statistics">结算统计</TabsTrigger>
        </TabsList>
        <TabsContent value="records"><SettlementRecords records={records} /></TabsContent>
        <TabsContent value="statistics"><SettlementStatistics records={records} /></TabsContent>
      </Tabs>
    </section>
  )
}
