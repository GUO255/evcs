# Platform Web

面向平台运营人员的充电运营管理 Web 应用。浏览器通过同源 Platform Web BFF 登录和访问业务服务，只持有 HttpOnly Session Cookie。

Workspace 包名：`@evcs/platform-web`

## 技术栈

- Bun Workspace
- React 19 + TypeScript
- Vite
- TanStack Router、TanStack Query、TanStack Store
- Tailwind CSS + Base UI/shadcn 组件约定
- ECharts

## 本地运行

先在仓库根目录安装依赖：

```bash
bun install
```

填写唯一的不入库开发输入文件，并启动完整开发环境：

```bash
bun run dev
```

稳定值来自 `ops/.env.development`，外部值只写入 `ops/.env.development.local`。启动预检将两者合并并校验到 `ops/.env.generated/development.platform-web-build.env`，Web 进程只加载该快照。完整规则见 [环境变量管理](../../docs/operations/environment-management.md)。应用按固定契约监听 `127.0.0.1:3120`，访问 <http://127.0.0.1:3120>；端口被占用时开发服务器会直接退出。

其他命令：

```bash
# TypeScript 类型检查
bun run --cwd apps/platform-web typecheck

# 浏览器 Session 边界测试
bun test apps/platform-web/tests/auth

# 生成生产构建
bun run --cwd apps/platform-web build

# 预览已生成的生产构建
bun run --cwd apps/platform-web preview
```

## 路由

| 路径 | 页面 | 当前状态 |
| --- | --- | --- |
| `/` | 运营总览 | 展示基础指标、站点活跃趋势和近期动态示例数据 |
| `/merchants` | 商户管理 | 业务占位页 |
| `/stations` | 充电站管理 | 业务占位页 |
| `/orders` | 订单管理 | 业务占位页 |
| `/system` | 系统管理 | 业务占位页 |
| `/auth/login` | 统一登录入口 | 用户确认后由 BFF 发起登录 |
| `/site-exploration` | 勘探站点列表 | 真实服务端筛选与游标分页 |
| `/site-exploration/new` | 新建勘探站点 | 22 项固定勘探内容 |
| `/site-exploration/$siteId` | 勘探站点详情 | 完整字段和现场图片 |
| `/site-exploration/$siteId/edit` | 编辑勘探站点 | 乐观并发保存和 OSS 多图管理 |
| `/exploration-teams` | 勘探小组 | 小组新增、编辑、启停及平台成员关系管理 |
| `/exploration-teams/$teamId` | 勘探小组详情 | 小组资料、分页成员列表及成员管理入口 |

开发服务器启用了 History API fallback，直接访问上述客户端路由时会返回同一份 SPA HTML，再由 TanStack Router 完成页面匹配。

## 目录与状态边界

```text
src/
├── components/          # 跨页面复用的布局、图表和基础 UI
├── features/            # 按业务能力组织的页面实现与本地示例数据
├── lib/                 # 导航配置、Query Client 等应用级基础设施
├── routes/              # TanStack Router 文件路由；保持轻量，只负责路由装配
├── stores/              # 仅存放跨组件的客户端 UI 状态
├── index.tsx            # React、Router 和 Query Provider 入口
└── styles.css           # 全局样式与设计 token
```

- 服务端数据由 TanStack Query 管理；不要复制到 Store 中。
- TanStack Store 只管理需要跨组件共享的客户端 UI 状态。当前仅包含移动端导航开关。
- OAuth access token 和 refresh token 不进入浏览器；BFF Session Cookie 对 JavaScript 不可见。
- 单个组件内部的短生命周期交互状态保留在组件内。
- `routeTree.gen.ts` 由 TanStack Router 插件生成，不手工编辑。
- 可复用 UI 放入 `components/`，业务实现及其数据适配放入对应的 `features/`。

## 数据与能力范围

运营总览使用 `src/features/dashboard/dashboard-fixtures.ts` 中的静态示例数据，指标、趋势和近期动态均不代表真实运营数据。勘探站点功能通过 Site Selection V2 Service 使用真实数据库和 OSS，其余仍未接入服务的业务页面属于说明性内容。

当前版本通过 `GET /api/me` 验证平台身份和 `platform:read` 权限。运营总览的业务数据仍为静态示例；后续真实接口继续由对应 feature 内的 TanStack Query 管理。

## 本地认证链路联调

本地登录要求三个服务使用完全一致的固定 Origin 和回调地址：

```text
auth-service       http://127.0.0.1:3200
platform-web-bff   http://127.0.0.1:3210
platform-service   http://127.0.0.1:3300
platform-web       http://127.0.0.1:3120
redirect_uri       http://127.0.0.1:3120/api/auth/callback
web CORS origin    http://127.0.0.1:3120
```

1. 在 `ops/.env.development.local` 填写所需外部输入；本地 Redis 必须可访问。
2. 运行 `bun run dev`。预检统一生成 `ops/.env.generated/` 下的角色快照，再启动完整链路。
3. 若 3120 已被占用，必须释放端口；不能让开发服务器改用其他端口，否则 OAuth 回调和 CORS 契约不会匹配。

未登录页面只展示手动登录入口，不自动重定向。回调、Token 交换与刷新全部由 BFF 完成；页面刷新通过 `/api/session` 恢复 Session，不会重新启动 OAuth。

联调检查：回调完成后地址栏不得保留 `code`、`state` 或错误参数；Local Storage、Session Storage 和浏览器请求头中不得出现 OAuth token；业务请求只能发往同源 `/gateway/*`；401 只呈现手动登录，不触发循环跳转。

详细设计见 [Platform Web Foundation Design](../../docs/superpowers/specs/2026-07-11-platform-web-foundation-design.md)。
