# 智能选址本地工具

这里仅保留旧 Site Selection 的本地联调、TiTiler 和交通数据处理工具。生产运行统一由
`ops/deploy/` 中的 Docker/ACK 方案负责；旧 `site-selection-web` 不再提供 PM2 生产部署入口。

## 小时车流热力图

服务器需要安装 GDAL，`site-selection-service` 使用 TypeScript 生成临时灰度 PGM，随后调用 `gdal_translate` 生成 COG：

```bash
gdal_translate --version
```

TiTiler 使用独立 Python 虚拟环境。本地执行 `bun run legacy-site-selection:dev` 时，如果环境不存在会自动安装；也可以手动初始化：

```bash
bun run setup:site-selection:titiler
```

`bun run legacy-site-selection:dev` 会同时启动 Web、API、Worker 和 TiTiler。
需要清理本地开发进程时，`bun run legacy-site-selection:stop` 会同时停止这四个进程。
如果 `127.0.0.1:8000` 已有可用的 TiTiler，本地开发会直接复用，不会重复启动。启动 Worker 前会自动同步本地评估运行配置。

生成指定北京时间小时的产品：

```bash
bun ops/site-selection/scripts/materialize-environment.ts development
bun --no-env-file --env-file=ops/.env.generated/development.site-selection-service-worker.env \
  run --filter @evcs/site-selection-service traffic:cog \
  --window-start "2026-01-15 10:00:00"
```

每个小时只保存一个版本化 COG；XYZ WebP 瓦片由 TiTiler 按请求动态生成，不提前生成小文件。
