# 通用 Bun 后端服务镜像（auth / platform / platform-web-bff / charging 共用）
# 构建上下文 = 仓库根目录（见 compose.yaml 的 build.context）
# ===========================================================================
# syntax=docker/dockerfile:1
ARG BUN_BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim

# 基础镜像：项目已验证可用的阿里云 ACR 镜像 + 安装 Bun
FROM ${BUN_BASE_IMAGE} AS runtime

ARG APP_NAME
WORKDIR /usr/src/evcs

RUN npm install --global bun@1.3.11 --registry=https://registry.npmmirror.com

# 复制整个仓库（.dockerignore 已排除 node_modules / .git / .env 等）
COPY . .

# 按 workspace 应用安装依赖（含本地 packages/* 依赖）
RUN bun install --frozen-lockfile --filter "@evcs/${APP_NAME}"

# 启动对应应用入口
CMD ["sh", "-c", "exec bun --no-env-file apps/${APP_NAME}/src/index.ts"]