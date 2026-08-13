# EVCS Web 端技术选型

## 1. 文档状态

- 状态：已接受
- 日期：2026-07-11
- 参考实现：现役 Web 应用
- 适用范围：`merchant-web`、`platform-web`、`site-selection-web`
- 不适用：微信小程序、后端 Service

## 2. 背景与约束

EVCS 的 Web 应用均是登录后使用的业务系统，包括商户管理、平台运营、智能选址和内部调试。这些应用不需要 SEO，也不需要服务端渲染。

核心目标：

1. 保留团队已有的 React 使用经验。
2. 降低 Next.js 开发编译和热更新链路带来的开销。
3. 在多个 Web 应用中统一路由、数据请求、状态管理和 UI 组件规范。
4. 支持智能选址系统的地图、图表和高频交互场景。
5. 保持纯客户端 SPA 架构，前后端通过明确 API 交互。

## 3. 选型结论

| 领域 | 选型 | 基线版本 | 职责 |
| --- | --- | --- | --- |
| 运行时与包管理 | Bun | 1.3.13 | Workspace、依赖安装、脚本执行 |
| UI 框架 | React | 19.2.7 | 组件化 UI 与客户端渲染 |
| 编译与开发服务 | Rsbuild / Rspack | 2.1.5 | TypeScript/JSX 编译、Fast Refresh、代码分割 |
| 语言 | TypeScript | 7.0.2 | 严格类型检查 |
| 路由 | TanStack Router | 1.170.17 | 类型安全文件路由、URL 状态、路由拆分 |
| 服务端数据 | TanStack Query | 5.101.2 | API 请求、缓存、失效、重试 |
| 客户端状态 | TanStack Store | 0.11.0 | UI 与交互状态、派生状态、精确订阅 |
| 样式 | Tailwind CSS | 4.3.2 | 原子化样式和语义化主题映射 |
| UI 组件 | shadcn/ui | 4.13.0 | 可控源码形式的产品 UI 原语 |
| UI 底层原语 | Base UI | 1.6.0 | 可访问性与复合交互行为 |
| 图标 | Lucide React | 1.24.0 | 统一线性图标 |
| 数据可视化 | Apache ECharts | 6.1.0 | 经营分析、运营看板和选址图表 |

版本号以现役 Web 应用的 workspace manifest 和锁文件中已验证配置为基线。新 Web 应用应优先复用该基线，不应各自选择主版本。

## 4. 整体架构

```text
Browser
└── React SPA
    ├── TanStack Router    # 页面导航、路由参数、URL 状态
    ├── TanStack Query     # 后端 API 数据与缓存
    ├── TanStack Store     # 客户端 UI 和交互状态
    ├── shadcn/ui          # 业务 UI 组件
    ├── Tailwind CSS       # 语义化主题和布局样式
    ├── ECharts            # 按需引入的图表能力
    └── platform-service   # 充电运营 API
```

智能选址业务通过 `site-selection-service` 获取选址计算和相关数据，不将计算规则复制到 Web 端。

## 5. 关键选型说明

### 5.1 React SPA，不使用 Next.js

Web 应用不需要 SEO、SSR 或 React Server Components，因此不引入 Next.js 的服务端渲染、服务端路由和全栈编译链路。React 仅负责浏览器内的 UI 渲染。

这个决定不影响文件路由：文件路由由 TanStack Router 在开发和编译阶段生成。

### 5.2 Rsbuild / Rspack

Rsbuild 作为 Web 应用专用工具链，Bun 继续负责包管理和脚本执行。Rsbuild React 插件提供 React Fast Refresh，Tailwind 官方 Rsbuild 插件直接基于 Tailwind 的 webpack loader，避免再经过额外 PostCSS 转换链路。

配置原则：

- 使用 `@rsbuild/plugin-react`。
- 使用 `@rsbuild/plugin-tailwindcss`。
- SPA 必须开启 `server.historyApiFallback` 或在生产 Web Server 配置等价回退。
- 每个应用使用独立的本地端口，并明确绑定地址，避免 IPv4/IPv6 同端口冲突。

### 5.3 TanStack Router

统一使用 `src/routes/` 文件路由：

```text
src/routes/
├── __root.tsx
├── index.tsx
└── stations/
    ├── index.tsx
    └── $stationId.tsx
```

规则：

- `routeTree.gen.ts` 由插件生成，禁止手工修改。
- 启用 `autoCodeSplitting` 实现路由级拆分。
- 分页、筛选、排序、时间范围等可分享页面状态放在 URL search params，不放入 Store。
- 部署服务必须将未命中静态资源的 HTML GET 请求回退到 `index.html`。

TanStack Router 官方将文件路由作为多数项目的推荐方式，并提供 Rsbuild/Rspack 插件集成。

### 5.4 TanStack Query

TanStack Query 是唯一的服务端数据缓存层，用于：

- API 查询与变更。
- 缓存、失效和后台刷新。
- 请求中、空数据和错误状态。
- 预取和路由加载协调。

禁止将 Query 返回的数据再复制到 TanStack Store，否则会形成两个数据源和额外同步链路。

### 5.5 TanStack Store

TanStack Store 只管理客户端交互状态，例如：

- 侧边栏展开状态。
- 地图工具模式和当前绘制状态。
- 未提交的复合编辑器状态。
- 跨组件的临时 UI 偏好。

Store 实例统一放在 `src/stores/`，组件通过 selector 订阅最小状态切片，避免订阅整个 Store。

TanStack Store 当前仍被官方标记为 alpha，这是一项已接受风险。团队需要：

- 锁定已验证的 minor 版本，不自动跨 minor 升级。
- 将 Store API 集中在 `src/stores/`，不在业务组件中到处直接调用底层 API。
- 每次升级前阅读官方 changelog，并对所有 Store 执行回归验证。
- 不将 Store 当作跨 App 实时数据通道。不同 App 的内存状态彼此独立；跨 App 数据必须通过后端、`BroadcastChannel` 或明确的持久化机制同步。

### 5.6 Tailwind CSS 与 shadcn/ui

Tailwind CSS 通过 Rsbuild 官方插件接入。shadcn/ui 使用：

- Base Nova 风格。
- Base UI 交互原语。
- Neutral 基础色。
- CSS Variables 语义化主题。
- Lucide 图标。

UI 规则：

- 优先使用 `src/components/ui/` 中的 shadcn 原语，不重复手写 Button、Dialog、Table、Select 等通用组件。
- 组件使用 `background`、`foreground`、`primary`、`muted`、`border` 等语义 token，不在业务页大量写固定颜色。
- shadcn 组件源码属于本项目，需要和普通业务代码一样进行审查。
- 禁止用未分层的全局 CSS 覆盖 Tailwind utility；全局基础规则应放入明确的 CSS layer 或避免与语义 utility 冲突。

### 5.7 ECharts

ECharts 只在需要图表的应用或路由中引入。禁止默认使用 `import * as echarts from 'echarts'` 将所有图表和渲染器打入主包。

使用原则：

- 从 `echarts/core`、`echarts/charts`、`echarts/components` 和 `echarts/renderers` 按需引入。
- 每个图表显式注册它需要的 chart、component 和 renderer。
- 大数据量、热力图或高频刷新优先 Canvas renderer。
- 图表路由使用路由级代码分割，避免影响不使用图表的页面首次加载。
- 组件卸载时必须释放 ECharts 实例和所有手工注册的事件。

## 6. 状态归属决策表

| 状态 | 所属 |
| --- | --- |
| 充电站列表、详情、统计指标 | TanStack Query |
| 提交、删除、审核等 API mutation | TanStack Query |
| 页码、筛选、排序、时间范围 | TanStack Router search params |
| 当前资源 ID | TanStack Router path params |
| 侧边栏、弹窗、地图工具状态 | 组件本地状态或 TanStack Store |
| 仅一个组件使用的短暂交互 | React 本地状态 |
| 用户主题、密度等本地偏好 | TanStack Store + 明确持久化 |
| 用户权限和账户数据 | TanStack Query，由后端作为真实数据源 |
| 跨应用或跨设备数据 | 后端 API / WebSocket，不是 Store |

默认顺序：先判断是否应在 URL，再判断是否属于服务端数据，最后才考虑 TanStack Store。

## 7. 建议目录结构

```text
src/
├── components/
│   ├── ui/                 # shadcn/ui 原语
│   └── shared/             # 应用内共享组件
├── features/                   # 按业务能力组织
│   └── stations/
│       ├── api/
│       ├── components/
│       └── model/
├── lib/                        # 框架适配和纯工具
├── routes/                     # TanStack Router 文件路由
├── stores/                     # TanStack Store 客户端状态
├── styles.css
├── index.tsx
└── routeTree.gen.ts            # 自动生成
```

只有已被至少两个应用真实复用的代码才进入根目录 `packages/`，不提前建设通用层。

## 8. 工程约定

### 8.1 脚本

每个 Web 应用至少提供：

```json
{
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "preview": "rsbuild preview",
    "typecheck": "tsc --noEmit"
  }
}
```

日常开发命令统一由 Bun 执行。

### 8.2 TypeScript

- 继承根目录严格 `tsconfig.json`。
- 开启 DOM 类型库。
- 使用 `@/* -> ./src/*` 路径别名。
- 禁止为了消除类型错误大范围使用 `any`。
- `routeTree.gen.ts` 等生成代码不进行手工编辑。

### 8.3 API 与性能

- 列表 API 必须使用服务端分页，不一次读取全量数据再在浏览器分页。
- 查询 key 必须包含所有影响返回结果的参数。
- 筛选和分页变化不复制整份 Query 数据。
- 大型路由、ECharts、地图和编辑器能力必须代码分割。
- 高频交互只订阅所需 Store 切片，不将高频瞬时数据提升到顶层 React state。

## 9. 不选择的方案

### Next.js

不需要 SSR、SEO 和 RSC，不值得承担对应的框架边界和开发编译成本。

### Vue / Angular / Svelte

团队已有 React 经验，当前不存在足以支付迁移成本的业务收益。

### React Router

当前方案更需要文件路由、URL search params 类型安全和自动路由分割，因此选择 TanStack Router。

### Zustand

Zustand 更成熟，但项目已明确选择框架无关、细粒度派生状态的 TanStack Store。对应代价是承担 alpha 阶段的升级风险。

### TanStack Start

不需要全栈路由、SSR 和 Server Functions，只使用 TanStack Router、Query 和 Store 的独立能力。

## 10. 风险与复审条件

| 风险 | 应对 |
| --- | --- |
| TanStack Store 仍处于 alpha | 锁定版本、集中封装、升级前回归验证 |
| 多 App 依赖版本漂移 | 以 workspace 锁文件为基线，统一升级 |
| ECharts 导致主包过大 | 按需引入、路由拆分、资源体积监测 |
| Query 和 Store 数据重复 | 执行状态归属决策表 |
| shadcn 组件在各 App 分叉 | 稳定后再将真实共享原语提取至 `packages/` |
| SPA 刷新子路由返回 404 | 开发和生产环境均配置 History API fallback |

出现以下情况时重新审查选型：

- Web 应用开始需要 SEO 或服务端渲染。
- TanStack Store 发生不兼容改动且迁移成本不可接受。
- Rsbuild/Rspack 插件生态无法支撑必需能力。
- 智能选址的图形或地图计算需要独立 Worker 架构。
- 实测数据表明当前工具链或运行时达不到性能目标。

## 11. 官方参考资料

- React：<https://react.dev/>
- Rsbuild React 集成：<https://rsbuild.rs/guide/framework/react>
- Rsbuild Tailwind CSS v4：<https://rsbuild.rs/guide/styling/tailwindcss>
- Rsbuild History API fallback：<https://rsbuild.rs/config/server/history-api-fallback>
- TanStack Router Quick Start：<https://tanstack.com/router/latest/docs/quick-start>
- TanStack Router + Rsbuild/Rspack：<https://tanstack.com/router/latest/docs/installation/with-rspack>
- TanStack Router 文件命名：<https://tanstack.com/router/v1/docs/routing/file-naming-conventions>
- TanStack Query：<https://tanstack.com/query/latest/docs/framework/react/overview>
- TanStack Store：<https://tanstack.com/store/v0>
- TanStack Store Quick Start：<https://tanstack.com/store/latest/docs/quick-start>
- Tailwind CSS：<https://tailwindcss.com/docs/installation>
- shadcn/ui 手动安装：<https://ui.shadcn.com/docs/installation/manual>
- shadcn/ui 主题：<https://ui.shadcn.com/docs/theming>
- Apache ECharts 按需引入：<https://echarts.apache.org/handbook/en/basics/import/>
- Apache ECharts Canvas 与 SVG：<https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/>
