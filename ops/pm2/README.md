# PM2 运维手册

PM2 只管理 EVCS 的长期运行进程。所有命令都以 ecosystem 文件或精确的 `evcs-*` 进程名为作用域，禁止使用 `pm2 kill`、`pm2 stop all` 或 `pm2 delete all`，以免影响同一主机上的其他应用。

## 环境准备

先安装依赖并生成稳定配置：

```bash
bun install
bun run env:generate
```

`bun run dev` 预检会在缺失时创建唯一的 `ops/.env.development.local`，并因未填写的占位符停止。逐项替换占位值再重试。稳定值来自自动生成的 `ops/.env.development`，不得复制到 local 文件。所有服务共享 MySQL schema `evcs`，各角色数据库别名由统一的 `EVCS_DATABASE_URL` 生成。开发数据库和迁移使用 `db:dev:*` 命令读取同一中央输入，详见根 README。

启动预检把 `ops/.env.development` 与 `ops/.env.development.local` 合并到 `ops/.env.generated/`。`ops/pm2/run-with-env.cjs` 只隔离加载对应角色快照，不依赖当前 shell 中残留的业务变量。开发端口是固定契约；Web 开发服务器启用 `strictPort`，端口占用时应失败并暴露冲突，不能自动切换端口。

首次初始化 Platform Owner 时，先在仓库根目录执行 `bun run db:dev:migrate`，再运行交互式 `bun run auth:owner:create`；开发命令明确加载 `ops/.env.development.local`，只读取其中的统一 `EVCS_DATABASE_URL`，不会回退到 `AUTH_MYSQL_URL`。生产使用 `auth:owner:create:production`，只接受部署环境注入的数据库地址。历史 `platform-owner` 数据缺少 Owner/RBAC 关联时，开发环境使用 `auth:owner:repair`，生产使用 `auth:owner:repair:production`。修复命令拒绝普通账号、封禁账号和冲突 Owner。PM2 启动与重启不会自动执行上述命令。只有迁移与显式 Owner 命令都成功后，才可执行 `bunx pm2 restart evcs-auth-service`。

## 开发环境

启动并检查七个进程：

```bash
bun run dev
bun run dev:status
```

`dev` 会先执行一次 Auth Web 构建，确保干净工作区在 Auth 接收请求前已有登录页资源。随后 `evcs-auth-web-builder` 使用 Vite build watch 持续更新资源；它不监听端口、不读取 Auth Secret，也不是独立应用服务。修改 `apps/auth-web` 后刷新浏览器即可看到新界面。

查看日志、重启或停止这些进程：

```bash
bun run dev:logs
bun run dev:restart
bun run dev:stop
```

`AUTH_SMS_PROVIDER=mock` 时，Mock OTP 会写入 `evcs-auth-service` 的本地 PM2 日志。OTP 属于敏感信息：开发日志禁止接入集中日志采集、转发或长期留存。验证完成后清理 Auth 日志：

```bash
bunx pm2 flush evcs-auth-service
```

不要把 Mock OTP 或任何日志中的验证码复制到工单、聊天或提交记录。

## 生产环境边界

Auth、Platform Service、Platform Web 和 Site Selection V2 的生产环境统一使用 Docker/ACK，不提供生产 PM2 ecosystem 或根级 PM2 回退命令。生产部署入口见 `ops/deploy/README.md`。
