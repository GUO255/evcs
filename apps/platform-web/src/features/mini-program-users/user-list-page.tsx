import { UserDataTable } from './user-data-table'
import { miniProgramUsers } from './user-data'

export function UserListPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">用户管理</h1>
        <p className="text-sm text-muted-foreground">查询充电小程序注册用户、会员及账号状态。</p>
      </header>

      <UserDataTable users={miniProgramUsers} />
    </section>
  )
}
