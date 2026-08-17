# 通用 Bun 后端服务镜像（Render 用，auth / platform / platform-web-bff / charging 共用）
# 构建上下文 = 仓库根目录；通过 build arg APP_NAME 指定要启动的应用
# ===========================================================================
# syntax=docker/dockerfile:2

ARG BUN_BASE_IMAGE=oven/bun:1.3.11

# ---- 依赖安装层（缓存 bun install 结果）----
FROM ${BUN_BASE_IMAGE} AS deps
WORKDIR /app

# 仅复制锁文件与工作区清单，最大化利用构建缓存
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --ci --ignore-scripts

# ---- 运行时层 ----
FROM ${BUN_BASE_IMAGE} AS runtime
WORKDIR /app

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/package.json ./package.json

# 默认随机端口，运行时可被 Render 的 $PORT 覆盖
ENV PORT=3000
EXPOSE 3000

# 启动对应 workspace 应用（Bun.serve 监听 $PORT）
CMD ["sh", "-c", "exec bun --no-env-file apps/${APP_NAME}/src/index.ts"]