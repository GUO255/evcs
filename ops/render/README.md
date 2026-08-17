# EVCS · Render 部署

用 Render Blueprint 一键部署 EVCS 全栈（1 前端 + 4 后端 Web Service）。

## 约束（重要）

1. **外部 MySQL**：Render 免费版不提供 MySQL 托管，必须使用外部 MySQL。
   - 可选：Aiven MySQL（免费 512MB）、PlanetScale、或你自己已有实例。
   - 创建后拿到连接串，形如 `mysql://user:pass@host:3306/dbname`。
2. **免费版冷启动**：免费 Web Service 闲置 15 分钟会休眠，首次访问会慢几秒。
3. **服务间通信走公网**：前端通过 `BFF_URL`（BFF 的公网地址）访问后端，非内网。

## 文件清单

| 文件 | 说明 |
|---|---|
| `ops/render/render.yaml` | Render Blueprint：定义 5 个服务及环境变量 |
| `ops/render/service.Dockerfile` | 后端通用镜像（`APP_NAME` 指定应用） |
| `ops/render/web.Dockerfile` | 前端镜像（vite 构建 + Bun 静态服务） |
| `ops/render/public-server.ts` | 前端静态服务器：SPA 回退 + 代理 `/api` `/gateway` `/local-objects` 到 BFF |

## 部署步骤

### 1. 推送代码到 GitHub
```bash
git add ops/render apps/auth-service/src/index.ts apps/platform-web-bff/src/index.ts \
        apps/platform-service/src/index.ts apps/charging-service/src/index.ts
git commit -m "feat: add Render deployment (blueprint + PORT binding adapt)"
git push origin dev
```

### 2. 在 Render 创建 Blueprint
1. 打开 <https://dashboard.render.com/#/templates/new> 或点 “New +” → **Blueprint**。
2. 选仓库 `GUO255/evcs`，Render 会自动读取 `ops/render/render.yaml`。
3. Review 每个服务，然后 **Apply New Resources**。
4. 会创建 5 个 Web Service 并开始首次构建。

### 3. 填写环境变量（在 Render → 每个 Service → Environment）
首次部署后到各服务 Emits 面板（或 Secret Files）填：
- **evcs-platform-web-bff**：`AUTH_MYSQL_URL`、`PLATFORM_WEB_BFF_DATABASE_URL`（外部 MySQL）
- **evcs-auth-service**：`AUTH_MYSQL_URL`、`AUTH_PLATFORM_WEB_ORIGIN`（前端公网地址）
- **evcs-platform-web**：`PUBLIC_TIANDITU_TOKEN`、`PUBLIC_AMAP_KEY`、`PUBLIC_AMAP_SECURITY_JS_CODE`（地图密钥）
- 填完保存会自动重新部署。

### 4. 建立前后端关联
1. 在 **evcs-platform-web** 的 Environment 中，把 `BFF_URL` 改为实际部署后 BFF 的公网地址（URL 路径，不含尾斜杠）。
2. 保存触发重建。

## 健康检查
- 每个服务 `/health`：`platform-service` 已实现返回 `{ok:true}`；其余服务若无 `/health` 路由，可在 Render 服务设置里把 Health Check Path 留空或改为 `/`。

## 排障
- 后端若报 `AUTH_MYSQL_URL is required`，说明该环境变量没配 → 去 Service → Environment 补上。
- 前端 502：检查 `BFF_URL` 是否指向可访问的 BFF 公网地址。
- 免费实例休眠后访问慢属正常，不需要重启。

## 后续正式上线
- Render 免费版仅适合测试。生产建议：换 `starter`/`pro` 套餐避免冷启动，或用阿里云 ECS + Gitee Go（见 `ops/gitee-deploy/README.md`）。