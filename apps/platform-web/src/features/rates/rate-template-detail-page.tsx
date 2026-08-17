import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CircleDollarSignIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { formatRateDateTime, getPricingModeLabel } from './rate-data'
import { RateTemplateForm } from './rate-template-form'
import { useRates } from './rate-store'

export function RateTemplateDetailPage({ templateId }: { templateId: string }) {
  const templates = useRates()
  const template = templates.find((record) => record.id === templateId)
  if (!template) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><CircleDollarSignIcon /></EmptyMedia>
          <EmptyTitle>未找到该费率模板</EmptyTitle>
          <EmptyDescription>模板可能已被删除，或当前链接无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/rates" className={buttonVariants()}>返回费率管理</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/rates" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回费率管理
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">编辑费率模板</h1>
          <Badge variant="secondary">{getPricingModeLabel(template.pricingMode)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{template.name} · 更新于 {formatRateDateTime(template.updatedAt)}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>模板信息</CardTitle>
          <CardDescription>修改电价、服务费、分时时段和模板备注。</CardDescription>
        </CardHeader>
        <CardContent>
          <RateTemplateForm
            key={template.id}
            template={template}
            cancelAction={<Link to="/rates" className={buttonVariants({ variant: 'outline' })}>取消</Link>}
            onSaved={() => undefined}
          />
        </CardContent>
      </Card>
    </section>
  )
}
