# Render 前端镜像：构建 platform-web 产物后，用 Bun 静态服务器托管
# 构建上下文 = 仓库根目录
# ===========================================================================
# syntax=docker/dockerfile:2

ARG BUN_BASE_IMAGE=oven/bun:1.3.11

# ---- 依赖安装层 ----
FROM ${BUN_BASE_IMAGE} AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --ci --ignore-scripts

# ---- 构建层：vite build ----
FROM ${BUN_BASE_IMAGE} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/package.json ./package.json
RUN bun --filter @evcs/platform-web build

# ---- 运行时层：静态服务器 ----
FROM ${BUN_BASE_IMAGE} AS runtime
WORKDIR /app
COPY --from=build /app/apps/platform-web/dist ./apps/platform-web/dist
COPY ops/render/public-server.ts ./server.ts
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "server.ts"]