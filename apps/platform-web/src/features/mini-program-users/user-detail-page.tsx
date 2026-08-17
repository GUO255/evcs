import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, UserRoundIcon } from '@/components/ui/icons'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { AccountBadge, formatCurrency, formatDateTime, formatPoints, MembershipBadge } from './user-data-table'
import { getMiniProgramUser } from './user-data'

export function UserDetailPage({ userId }: { userId: string }) {
  const user = getMiniProgramUser(userId)

  if (!user) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UserRoundIcon /></EmptyMedia>
          <EmptyTitle>未找到该用户</EmptyTitle>
          <EmptyDescription>当前链接中的用户 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/users" className={buttonVariants()}>返回用户列表</Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/users" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回用户列表
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback>{user.nickname.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{user.nickname}</h1>
              <MembershipBadge status={user.membershipStatus} />
              <AccountBadge status={user.accountStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{user.userCode} · {user.mobile}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>小程序用户的账号及实名资料。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DefinitionItem label="用户编号" value={user.userCode} />
              <DefinitionItem label="用户昵称" value={user.nickname} />
              <DefinitionItem label="姓名" value={user.realName} />
              <DefinitionItem label="手机号" value={user.mobile} />
              <DefinitionItem label="所在地区" value={user.region} />
              <DefinitionItem label="账号状态" value={<AccountBadge status={user.accountStatus} />} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>注册与活跃</CardTitle>
            <CardDescription>用户在充电小程序中的注册及最近访问情况。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DefinitionItem label="注册渠道" value="充电小程序" />
              <DefinitionItem label="注册时间" value={formatDateTime(user.registeredAt)} />
              <DefinitionItem label="最近活跃时间" value={formatDateTime(user.lastActiveAt)} />
              <DefinitionItem label="绑定车辆数" value={`${user.vehicleCount} 辆`} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>会员信息</CardTitle>
            <CardDescription>会员开通状态、等级及有效期。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DefinitionItem label="会员状态" value={<MembershipBadge status={user.membershipStatus} />} />
              <DefinitionItem label="会员等级" value={user.membershipLevel ?? '—'} />
              <DefinitionItem label="开通日期" value={user.membershipStartedAt ?? '—'} />
              <DefinitionItem label="有效期至" value={user.membershipExpiresAt ?? '—'} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>充电概览</CardTitle>
            <CardDescription>用户在平台产生的累计充电数据。</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DefinitionItem label="累计充电次数" value={`${user.chargingCount} 次`} />
              <DefinitionItem label="累计充电电量" value={`${user.chargingEnergy.toLocaleString('zh-CN')} kWh`} />
              <DefinitionItem label="累计充电消费" value={formatCurrency(user.chargingAmount)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>积分</CardTitle>
            <CardDescription>用户当前可用积分。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatPoints(user.points)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>储值余额</CardTitle>
            <CardDescription>用户当前可用储值金额。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(user.storedBalance)}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function DefinitionItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}
