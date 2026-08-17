# 极充智联 开发工具

极充智联（内部代号 EVCS，Electric Vehicle Charging System）是一个电动汽车充电站运营平台。本仓库是该平台
的开发工具链：采用 Bun Workspace 管理多个前端应用、后端服务和共享包，并统一维护环境契约、
开发进程、数据库迁移与部署资产。

## 项目结构

```text
evcs/
├── apps/                         # 可独立运行和部署的应用（auth-web / platform-web 已接入真实前端）
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
- [充电小程序方案与技术选型](docs/architecture/charging-mini-program-proposal.md)
- [认证服务架构](docs/architecture/auth-service.md)
- [Platform Access Token 契约](docs/contracts/access-token-claims.md)
- [环境变量管理](docs/operations/environment-management.md)
- [Swagger / OpenAPI 接口管理](docs/operations/swagger.md)

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

- `apps/auth-web` 与 `apps/platform-web` 已接入真实前端：登录页
  `http://127.0.0.1:3220`、平台前端 `http://127.0.0.1:3250`；其余后端应用仍为进程占位，
  将同名真实应用放入 `apps/<name>/` 后，环境契约、PM2 编排与 Owner 运维命令无需改动即可生效。
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

`dev` / `dev:restart` / `dev:status` 执行结束后只打印前端页面地址：Auth 登录页
`http://127.0.0.1:3220` 与平台前端 `http://127.0.0.1:3250`，并在 `Database (Docker)` 中显示
MySQL 容器与 Adminer 的运行状态。其余后端进程仍在 PM2 表格中可见，不再单独列出访问地址。

登录页使用用户名密码注册/登录（无验证码）：注册账号会写入开发库
`dev_auth_credentials` 表（argon2 哈希），登录成功后跳转平台前端
`http://127.0.0.1:3250`。

开发环境下平台前端默认免认证：BFF 进程对 `/api/session` 返回已登录会话，对
`/gateway/platform/api/me` 返回拥有全部平台权限的 `开发管理员` 身份，直接打开
`http://127.0.0.1:3250` 即可进入平台，无需走登录页。

## 本机数据库端口说明

本机 `127.0.0.1:3306` 被一个 root 权限的既有隧道占用（转发到远程 MySQL 8.0，不是开发库），
开发容器无法在宿主侧绑定该端口。当前开发库使用容器内 3306 并额外转发到宿主
`127.0.0.1:3307`，由命令统一管理：

```bash
bun run db:forward          # 启动 127.0.0.1:3307 -> Colima:3306（幂等）
bun run db:forward:status   # 查看转发状态
bun run db:forward:stop     # 停止
```

宿主机数据库客户端（DataGrip/Navicat/DBeaver 等）连开发库时填写：主机 `127.0.0.1`、
端口 `3307`、用户名 `evcs`、密码 `123456`、数据库 `evcs`。`mysql` / `mysql-development`
是 Docker 网络内部别名，宿主机客户端无法解析；`3306` 是源 EVCS 的既有隧道
（远程 MySQL 8.0），不是本开发库。

`ops/.env.development.local` 中的 `EVCS_DATABASE_URL` 已指向 `127.0.0.1:3307/evcs`。
`db:dev:start` / `db:dev:migrate` 两个命令与源项目一致、固定校验 `127.0.0.1:3306`，因此本机
无法直接使用；迁移等价命令为：

```bash
bun --no-env-file --env-file=<含 EVCS_DATABASE_URL 的 env 文件> ops/database/migrate.ts
```

数据库可视化使用 Adminer（单容器 Web UI，`http://127.0.0.1:8081`），通过
`database_default` 网络直连开发库。登录填写：服务器 `mysql`、用户名 `evcs`、
密码 `123456`、数据库 `evcs`（密码为本机开发库密码，在
`ops/.env.development.local` 的 `EVCS_DATABASE_URL` 中维护）。容器与 PM2 独立管理：

```bash
bun run db:adminer        # 启动（幂等）
bun run db:adminer:stop   # 停止
```

`bun run dev:status` 的 Database 段落会同时显示 3307 转发是否 active。

TiTiler 的 `127.0.0.1:8000` 当前由源 EVCS 实例提供，本实例不再重复启动该进程（与
`legacy-site-selection:dev` 的复用逻辑一致）。
