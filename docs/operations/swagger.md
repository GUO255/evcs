# Swagger / OpenAPI 管理

项目使用静态 OpenAPI 3.1 文档按服务分类，所有接口通过一个本地 Swagger UI 页面统一查看。

## 服务分类

| 服务 | Swagger 文档 | 本地地址 | 说明 |
| --- | --- | --- | --- |
| Auth Service | `docs/api/auth-service.openapi.yaml` | `http://127.0.0.1:3210` | 登录、CSRF、健康检查 |
| Charging Service | `docs/api/charging-service.openapi.yaml` | `http://127.0.0.1:3241` | 充电小程序 C 端接口 |
| Platform Service | `docs/api/platform-service.openapi.yaml` | `http://127.0.0.1:3230` | 平台服务占位 |
| Platform Web BFF | `docs/api/platform-web-bff.openapi.yaml` | `http://127.0.0.1:3240` | 平台 Web BFF、RBAC、智能选址网关 |
| Site Selection Services | `docs/api/site-selection-services.openapi.yaml` | `http://127.0.0.1:3260` | 选址 V2 占位 |

## 启动开发环境 Swagger

```bash
bun run swagger:dev
```

该命令固定使用开发环境配置 `SWAGGER_ENV=development`，默认地址：`http://127.0.0.1:18082`。

开发环境接口清单由 `ops/swagger/environments/development.json` 维护，页面会显示当前环境和各服务说明。可直接覆盖监听地址和端口：

```bash
SWAGGER_HOST=0.0.0.0 SWAGGER_PORT=18082 SWAGGER_ENV=development bun run swagger:dev
```

## 让同事访问

Swagger 服务默认监听 `0.0.0.0`，同一局域网内的同事可以用本机 IP 访问。

先查本机局域网 IP：

```bash
ipconfig getifaddr en0
```

然后带 `SWAGGER_PUBLIC_HOST` 启动，它会把 OpenAPI 中原本的 `127.0.0.1` 替换成该 IP，避免同事点击 “Try it out” 时请求到自己的电脑：

```bash
SWAGGER_PUBLIC_HOST=192.168.1.10 bun run swagger:dev
```

同事访问：

```text
http://192.168.1.10:18082
```

要求：

- 双方在同一网络，且本机防火墙允许入站 `18082` 端口。
- 如需通过 Swagger 实际调用后端接口，对应后端服务也必须监听 `0.0.0.0` 且防火墙放行对应端口。
- Swagger UI 本身使用 CDN，访问方需要能连接 `jsdelivr` 或 `unpkg`。

公网访问不建议直接暴露开发 Swagger。优先使用 SSH 隧道、内网 VPN，或 `cloudflared`/`frp` 等临时隧道。

## 维护方式

- 每个服务维护独立的 `docs/api/<service>.openapi.yaml`。
- `ops/swagger/environments/development.json` 控制开发环境下拉列表中展示哪些服务，以及服务名称和说明。
- `ops/swagger/serve.ts` 提供 `/`、`/specs.json`、`/docs/api/*.yaml` 和 `/healthz`。
- 新增服务时：在 `docs/api/` 添加 OpenAPI YAML，并把服务登记到对应环境 JSON 后刷新页面即可。
- 当前文档是静态维护的。如果后续需要运行时自动生成，可在服务端接入 OpenAPI 注解或从路由表导出 spec。
