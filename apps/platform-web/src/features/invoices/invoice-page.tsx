import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { getInvoiceRecords } from './invoice-data'
import { InvoiceRecords } from './invoice-records'
import { InvoiceMetrics, InvoiceSubjectStatistics } from './invoice-statistics'

export function InvoicePage() {
  const records = getInvoiceRecords()
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">发票申请</h1>
        <p className="text-sm text-muted-foreground">处理开票申请，并查看客户、商户和用户的开票统计。</p>
      </header>

      <InvoiceMetrics records={records} />

      <Tabs defaultValue="records" className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          <TabsTrigger value="records">开票记录</TabsTrigger>
          <TabsTrigger value="customer-statistics">客户统计</TabsTrigger>
          <TabsTrigger value="merchant-statistics">商户统计</TabsTrigger>
          <TabsTrigger value="user-statistics">用户统计</TabsTrigger>
        </TabsList>
        <TabsContent value="records"><InvoiceRecords records={records} /></TabsContent>
        <TabsContent value="customer-statistics"><InvoiceSubjectStatistics records={records} subjectType="customer" /></TabsContent>
        <TabsContent value="merchant-statistics"><InvoiceSubjectStatistics records={records} subjectType="merchant" /></TabsContent>
        <TabsContent value="user-statistics"><InvoiceSubjectStatistics records={records} subjectType="user" /></TabsContent>
      </Tabs>
    </section>
  )
}
