# 环境变量管理

EVCS 的环境变量清单、归属、稳定值、校验规则和角色别名统一定义在
`ops/environment/schema.ts`。`ops/.env.development`、`ops/.env.production` 和
`ops/deploy/production/compose.config.example` 都是生成产物，不得手工编辑。

整体采用两层校验：`ops/environment` 负责部署侧的变量清单、来源、角色快照和启动前完整性；
应用在唯一配置边界通过 `@evcs/runtime-config` 的 Zod 基础类型解析自己的协议约束。前一层防止
部署缺项和越权注入，后一层保证应用拿到不可歧义的布尔值、整数、URL、密钥及跨字段关系。
两层职责独立，不从部署 schema 自动生成应用 schema。

## 字段与分类

每个变量声明说明、消费角色、作用域、开发/生产来源、校验规则、敏感性、服务端或
`build-public` 暴露方式，以及必要的角色别名。来源只有四类：

- `stable`：随代码和镜像发布，由 profile 快照提供；修改后必须重新生成并重新构建镜像。
- `external-required`：必须由开发者本地文件或部署平台提供，缺失、空值和占位符都会失败。
- `external-optional`：允许省略；示例中以注释形式出现。
- `runtime-managed`：由运行平台管理，不写入角色快照。

浏览器的 `build-public` 值会进入静态资源，不能标记为 Secret。服务端敏感值只允许从
外部注入；校验错误只报告键名和规则，不输出原值。

## 开发环境

先生成并检查版本化文件：

```bash
bun run env:generate
bun run env:contract:check
```

开发环境只有两个输入：`ops/.env.development` 保存 schema 生成的稳定值，
`ops/.env.development.local` 保存全部本机外部值和密钥。首次执行 `bun run dev` 时，
缺失的 local 文件会从 schema 创建；占位符仍会让启动失败，必须填写后重试。
local 文件由工具保持为 `0600`，并被 Git 忽略。

PM2 启动前把这两个输入合并为最小角色快照，写入被 Git 忽略的
`ops/.env.generated/`。每个进程只加载自己的快照和 `PATH`、`HOME`、`TMPDIR`、`LANG`，
不继承 shell 中残留的业务变量。旧的分服务环境输入已经移除，不再提供迁移或兼容入口。

开发数据库仍只读取同一份 `ops/.env.development.local` 中的 `EVCS_DATABASE_URL`。
`ops/database/development-environment.ts` 校验它必须指向本机 `127.0.0.1:3306/evcs`，再派生
Compose 启动所需的 schema、用户和密码，写入 `ops/.env.generated/development.database.env`。
派生文件包含凭据、被 Git 忽略，不得手工维护。

```bash
bun run db:dev:start
bun run db:dev:migrate
bun run db:dev:stop
```

需要单独物化角色时使用：

```bash
bun ops/environment/scripts/materialize-runtime-env.ts \
  --profile development \
  --role platform-service \
  --output-dir ops/.env.generated
```

## 生产环境

Bun 服务镜像从 `ops/.env.production` 生成 production 角色快照。快照包含稳定值和外部值的空槽；
Compose 或 ACK 在运行时只注入外部值。Bun 保留已有进程环境的优先级，因此部署注入会
覆盖空槽。容器入口点先验证合并后的完整角色环境，再 `exec` 应用进程。

生产覆盖顺序固定为：版本化 `ops/.env.production` 稳定值 → 镜像内角色快照 → 部署平台注入的
外部值。Secret、动态地址和发布批次值只允许在最后一层出现；不得把生产 Secret 写回仓库文件。
`build-public` 值虽然不是 Secret，但会编译进浏览器静态资源，任何变更都必须重建 Web 镜像。

独立主机运维需要物化完整生产快照时，所有外部值集中写入被 Git 忽略且权限为 `0600`
的 `ops/.env.production.local`；不得创建分服务 production local 文件。

稳定值变更需要 `bun run env:generate`、提交生成文件并构建新镜像。外部值变更需要更新
部署注入并重启对应工作负载；浏览器外部值是构建参数，仍需重建 Web 镜像。

## 变更变量

1. 只修改 `ops/environment/schema.ts`，明确角色、来源、校验、敏感性和示例。
2. 应用只能在批准的 config/entrypoint 边界读取环境；业务模块接收类型化配置。
3. 运行 `bun run env:generate`，检查生成差异。
4. 运行 `bun run env:contract:check` 和相关 parser/部署测试。
5. 删除变量时同时删除应用读取点；扫描器不允许未声明键或业务模块直接读取。

扫描器自动遍历全部 `apps/` 以及可执行 `ops/` 源码，覆盖 JavaScript/TypeScript、Shell 和
Python。新增应用不需要修改扫描根清单；只有列明的配置入口可以读取环境，业务文件必须通过
类型化配置接收值。Shell/Python 中出现的新键也必须先进入集中 schema 或明确的平台自有键集合。

不要在稳定文件、日志、异常、命令行历史或提交记录中放入真实凭据。诊断失败时
根据错误中的 profile、role、key 和规则检查输入文件；不要使用 `printenv` 或输出整个环境。

常见故障处理：

- `Stale environment contract file`：运行 `bun run env:generate`，审查并提交生成差异。
- `contains a forbidden placeholder`：在 `.local` 或部署 Secret 中填写真实值，不能放宽校验。
- `Environment variable is not declared`：先补充集中 schema 与归属，再重新生成，不能加忽略规则。
- 应用 Zod 错误：按报告的键名修正输入；错误不会回显原始密钥。
- Compose 数据库启动失败：重新运行 `bun run db:dev:start` 物化派生文件，不直接编辑 `.generated`。

## Legacy Site Selection

旧 Site Selection 也由同一 schema 管理，分别归属
`site-selection-service-api`、`site-selection-service-worker` 和
`site-selection-web-build`。它们与其他应用共用同一 profile 输入；服务端 API 在组合根
一次解析不可变配置，旧 Web 只通过 `src/config/env.ts` 读取浏览器变量。

本地开发只填写 `ops/.env.development.local`，`bun run legacy-site-selection:dev` 会在启动前生成角色快照。
旧 Site Selection 只保留本地联调入口；生产环境使用 `ops/deploy/` 下统一的 Docker/ACK
方案，不再提供独立 PM2 生产流程。旧的分服务环境输入目录已移除。
