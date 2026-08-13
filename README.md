# EVCS 开发工具

EVCS（Electric Vehicle Charging System）是一个电动汽车充电站运营平台。本仓库是该平台
的开发工具链：采用 Bun Workspace 管理多个前端应用、后端服务和共享包，并统一维护环境契约、
开发进程、数据库迁移与部署资产。

## 项目结构

```text
evcs/
├── apps/                         # 可独立运行和部署的应用（当前为占位进程，接入真实应用后无缝替换）
├── packages/                     # 跨应用复用的共享包
├── ops/                          # 开发与运维工具链
│   ├── environment/              # 环境变量契约：schema、解析、物化与扫描
│   ├── pm2/                      # PM2 开发进程编排
│   ├── database/                 # 数据库开发容器、迁移与数据导入工具
│   ├── auth/                     # 认证 Owner 引导与修复
│   ├── platform/                 # 平台 RBAC 引导
│   ├── deploy/                   # 生产镜像构建与 ACK 渲染
│   ├── site-selection/           # 智能选址遗留开发与 TiTiler 工具
│   └── site-selection-v2/        # 智能选址 V2 运维工具
└── docs/                         # 架构、契约与运维文档
```

## 开发约定

- 使用 Bun 作为 JavaScript/TypeScript 运行时和包管理器。
- 可独立运行、发布或部署的项目放在 `apps/`。
- 仅在多个应用之间真实复用的代码放在 `packages/`。
- 部署脚本和进程配置放在 `ops/<业务域>/`；全项目共享的数据库运维资产统一放在 `ops/database/`。
- 跨应用集成测试放在 `tests/`。

## 技术文档

- [Web 端技术选型](docs/architecture/web-technology-selection.md)
- [认证服务架构](docs/architecture/auth-service.md)
- [Platform Access Token 契约](docs/contracts/access-token-claims.md)
- [环境变量管理](docs/operations/environment-management.md)

安装依赖：

```bash
bun install
```

## 环境与本地启动

环境契约由 `ops/environment/schema.ts` 统一维护。先确保版本化稳定配置与 schema 一致：

```bash
bun run env:generate
bun run env:contract:check
```

开发环境只有两个输入文件：自动生成且提交 Git 的 `ops/.env.development`，以及唯一需要
开发者填写、不会提交的 `ops/.env.development.local`。不要编辑稳定文件或
`ops/.env.generated/`。首次执行下列命令会从 schema 创建缺失的 local 文件，并在配置
完整后生成每个进程的最小快照：

```bash
bun run dev
bun run dev:status
```

完整的变量分类、密钥规则、单角色物化和生产注入方式见
[环境变量管理](docs/operations/environment-management.md)。

启动智能选址的 Web、API 和后台 Worker：

```bash
bun run legacy-site-selection:dev
```

启动前会把两个中央开发输入合并为三个最小角色快照，统一写入
`ops/.env.generated/`。旧的 `ops/site-selection/env/` 不再使用。

## 数据库运维

所有数据库应用共享 MySQL schema `evcs`。开发数据库容器和迁移命令都从中央
`ops/.env.development` 与 `ops/.env.development.local` 读取唯一的 `EVCS_DATABASE_URL`；
Compose 所需字段生成到 `ops/.env.generated/development.database.env`，不再维护独立开发 env 文件：

```bash
bun run db:dev:start
bun run db:dev:migrate
bun run db:dev:stop
```

集成测试数据库不是应用运行环境；它是独立、可丢弃的测试基础设施，使用专用端口、数据卷和测试凭据，可与开发实例并存：

```bash
docker compose --env-file ops/database/env/test.env --profile test -f ops/database/compose.yaml up -d mysql-test
```

不要用 test profile 承载开发数据，也不要让集成测试连接 development profile。

首次创建 Platform Owner 必须先从仓库根目录完成开发迁移，再执行开发环境创建命令。命令明确加载本地 `ops/.env.development.local`，并交互式读取手机号，避免手机号进入 shell 历史：

```bash
cd /path/to/evcs
bun run db:dev:migrate
bun run auth:owner:create
```

开发自动化可显式传入 `--phone "$OWNER_PHONE"`。生产环境使用 `auth:owner:create:production`，只接受部署系统注入的 `EVCS_DATABASE_URL`，不会读取本地环境文件。所有 Owner 命令的唯一数据库来源都是统一 schema 的 `EVCS_DATABASE_URL`，不会回退到 `AUTH_MYSQL_URL`。不要将连接凭据或电话号码写入仓库或日志。创建操作仅能成功一次，之后的 `owner_exists` 失败是预期且安全的，不会修改已有 Owner。

升级前已经存在且角色确认为 `platform-owner`、但缺少 Owner 单例或平台 RBAC 绑定的历史账号，只能由显式修复命令处理：

```bash
bun run auth:owner:repair
```

修复命令不会提升普通账号，不会接管已被封禁的账号，也不会覆盖冲突 Owner；Owner 单例、受保护平台成员、超级管理员角色和审计记录在同一事务中提交。PM2 启动和重启从不自动创建或修复 Owner。仅在迁移与 Owner 管理命令成功后，才重启 Auth 进程：`bunx pm2 restart evcs-auth-service`。

生产历史数据修复使用 `auth:owner:repair:production`，并同样要求部署环境显式注入 `EVCS_DATABASE_URL`。

唯一迁移入口先取得 MySQL advisory lock，随后按 Auth、Site Selection 的顺序执行迁移；重复执行不会再次应用已登记的迁移。当前仅支持从无真实业务数据的空 `evcs` 初始化，不执行跨 schema 数据复制。`questionnaire_submission` 明确不在本次数据库初始化、迁移或校验范围内。

集成测试必须使用独立的 `127.0.0.1:3310/evcs` 实例，不得指向开发实例 `127.0.0.1:3306/evcs`。

## 统一应用管理

长期运行的后端、Worker 和本地开发 Web 进程由 PM2 统一管理。环境准备、精确的启动/日志/停止命令、Mock OTP 日志安全和生产持久化约束见 [PM2 运维手册](ops/pm2/README.md)。所有根级 PM2 命令仅作用于 EVCS ecosystem 或精确的 `evcs-*` 进程名，不会全局停止或删除同一主机上的其他 PM2 应用。

## 当前仓库的接入说明

- `apps/` 内的进程占位符让工具链可以立即运行；将同名真实应用放入 `apps/<name>/`
  后，环境契约、PM2 编排与 Owner 运维命令无需改动即可生效。
- 依赖业务应用源码的测试（Dockerfile、nginx、rsbuild、Owner 真实数据库等契约测试）
  不在本仓库内，随真实应用代码一并迁入。
- 工具链自检命令：`bun run env:generate`、`bun run env:contract:check`、
  `bun test ops/environment/tests ops/pm2/tests ops/database/tests ops/deploy/tests ops/auth/tests ops/platform ops/site-selection/scripts/road-segmenter.test.ts`。

## 与其它 EVCS 实例共存

PM2 进程名和 namespace 与源项目一致。如果同一台机器上还有其它 EVCS 实例（或本仓库的源
项目）在运行，开发命令会命中同一个默认 PM2 守护进程。为本项目使用独立守护进程：

```bash
PM2_HOME="$PWD/.pm2" bun run dev
PM2_HOME="$PWD/.pm2" bun run dev:status
PM2_HOME="$PWD/.pm2" bun run dev:stop
```

TiTiler 固定使用 `127.0.0.1:8000`。端口被其它程序占用时该进程无法启动；若本机已有可用的
TiTiler，可直接复用（与 `legacy-site-selection:dev` 的复用逻辑一致），无需在本实例再启动。
