# Gitee Go 三环境一键部署方案

新一代部署流程（替代旧版 K8s/复杂构建体系）：**三分支 → Gitee Go 流水线 → 三套 Docker Compose → 共享 MySQL 分库**。

```
dev / test / main(prod) 分支
        │  push / 合并 / 手动
        ▼
   Gitee Go 一键流水线
   ┌────────────────────────────┐
   │ deploy@host → deploy.sh    │
   │ 切分支 → 建库 → 迁移 → up  │
   └─────────────┬──────────────┘
                 ▼
   Dev / Test / Prod  <- 各自一套 Docker Compose（核心套件）
                 │
                 ▼
      共享 MySQL 实例 · 分库 evcs_dev/evcs_test/evcs_prod
```

## 目录结构

```
ops/gitee-deploy/
├── README.md                  # 本文件
├── .gitignore                 # 忽略本地 .env.*（真实凭据不入库）
├── compose.yaml               # 三环境通用 Compose 骨架
├── .env.dev.example           # 开发环境变量模板
├── .env.test.example          # 测试环境变量模板
├── .env.prod.example          # 生产环境变量模板
├── deploy.sh                  # 主机端一键部署脚本
└── images/
    ├── web.Dockerfile         # platform-web：vite build → nginx
    ├── web-nginx.conf         # 部署用 nginx（代理到 bff:3240）
    └── service.Dockerfile     # 通用后端服务镜像（auth/platform/bff/charging）
.gitee/workflows/evcs.yml      # Gitee Go 流水线
```

## 分支与环境映射

| 分支 | 环境 | 触发方式 | 数据库 |
|------|------|----------|--------|
| `dev` | Dev | push 自动 | `evcs_dev` |
| `test` | Test | push 自动 | `evcs_test` |
| `main` | Prod | 合并 + 人工确认 | `evcs_prod` |

## 接入步骤（服务端/运维）

1. **开通 Gitee Go**：Gitee 仓库 → 服务/流水线 → 开通 Gitee Go（企业组织每月 500 分钟免费）。
2. **建主机组**：Gitee Go 控制台 → 主机组，添加三组 SSH 主机 `dev-hosts / test-hosts / prod-hosts`（需可 SSH 访问、已装有 bun / docker / docker compose）。
   - 主机需提前配置好仓库 `git` 凭据（用于脚本内 `git fetch/checkout/pull`）。
3. **绑定触发**：流水线设置里，把 `dev 分支 → dev-hosts`、`test 分支 → test-hosts`、`main 分支 → prod-hosts`，并分别把 `hostGroupID` 填入 `.gitee/workflows/evcs.yml`。
4. **各主机放环境变量**：把 `ops/gitee-deploy/.env.dev.example` 复制为 `.env.dev` 并填写真实凭据/域名；test/prod 同理。`deploy.sh` 首次运行会自动从模板生成空文件并提示填写。
5. **提交代码**：push `dev`/`test`/`main` 分支，流水线自动执行 `deploy.sh <env>` → 建库 → `migrate.ts` 迁移 → `docker compose up -d --build`。

## 本地手动验证（示例）

```bash
# 生成 .env.dev 并填写
cp ops/gitee-deploy/.env.dev.example ops/gitee-deploy/.env.dev

# 方式一：直接跑部署脚本
bash ops/gitee-deploy/deploy.sh dev

# 方式二：不建库不迁移，仅构建启动
docker compose -f ops/gitee-deploy/compose.yaml --env-file ops/gitee-deploy/.env.dev up -d --build
```

## 注意事项

- **共享 MySQL**：默认 `compose.yaml` 自带一个 `mysql:8.0` 服务作为本地共享实例。
  若各环境使用的是外部共享 MySQL / 云 RDS，把 `.env.<env>` 的 `MYSQL_HOST` 指向外部地址，并注释掉 compose 里的 `mysql` 服务即可。
- **敏感变量**：`ops/gitee-deploy/.env.dev|test|prod` 已被 `.gitignore` / `.dockerignore` 排除，不会进仓库或镜像。
- **环境变量顺序**：`.env.<env>` 内密码建议避免 `@ : /` 等 URI 保留字符；如需复杂密码，可在 `.env` 中直接覆盖 `PLATFORM_WEB_BFF_DATABASE_URL` / `AUTH_MYSQL_URL` 为完整编码后的 DSN。
- **charging-service 绑定**：其入口 `src/index.ts` 绑定 `127.0.0.1`，容器内端口映射对外生效需把 hostname 改为 `0.0.0.0`（本方案保留服务但不保证公网直连，按需调整）。
- **认证建表**：`auth-service` 当前会自建 `dev_auth_credentials` 表（表名前缀为代码硬编码），与 drizzle 迁移体系不一致；如需规范，后续可在业务侧统一。
- **迁移作用域**：`EVCS_MIGRATION_SCOPE` 默认 `all`，可用 `core/platform/site-selection` 收敛，避免重复迁移非目标库。

## 待办（需你后续补全）

- [ ] 开通 Gitee Go，创建三组主机
- [ ] 在 `.env.dev/test/prod` 填写真实 MySQL 凭据、前端 `PUBLIC_*` key、生产域名
- [ ] 把 `hostGroupID` 写回 `.gitee/workflows/evcs.yml`