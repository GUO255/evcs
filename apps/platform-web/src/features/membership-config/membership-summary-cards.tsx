import {
  BadgePercentIcon,
  GiftIcon,
  PackageCheckIcon,
} from '@/components/ui/icons'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import type {
  MembershipBenefit,
  MembershipProduct,
  MembershipStationPrice,
} from './membership-config-types'

interface MembershipSummaryCardsProps {
  products: readonly MembershipProduct[]
  benefits: readonly MembershipBenefit[]
  stationPrices: readonly MembershipStationPrice[]
}

const summaryCards = [
  {
    key: 'products',
    title: '在售会员商品',
    description: '当前可供小程序用户购买',
    icon: PackageCheckIcon,
  },
  {
    key: 'benefits',
    title: '启用权益',
    description: '当前在会员中心展示',
    icon: GiftIcon,
  },
  {
    key: 'stationPrices',
    title: '专享价场站',
    description: '当前提供会员充电专享价',
    icon: BadgePercentIcon,
  },
] as const

export function MembershipSummaryCards({
  products,
  benefits,
  stationPrices,
}: MembershipSummaryCardsProps) {
  const enabledCounts = {
    products: products.filter((product) => product.status === 'enabled').length,
    benefits: benefits.filter((benefit) => benefit.status === 'enabled').length,
    stationPrices: stationPrices.filter((price) => price.status === 'enabled').length,
  } satisfies Record<(typeof summaryCards)[number]['key'], number>

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaryCards.map(({ key, title, description, icon: Icon }) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">{enabledCounts[key]}</p>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
