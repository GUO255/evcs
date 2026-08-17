# platform-web 前端镜像：vite 构建静态产物 → nginx 托管
# 构建上下文 = 仓库根目录
# ===========================================================================
# syntax=docker/dockerfile:1
ARG BUN_BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim
ARG NGINX_BASE_IMAGE=registry.cn-hangzhou.aliyuncs.com/tgwm-electric/nginx

# ---- 构建阶段：生成 dist ----
FROM ${BUN_BASE_IMAGE} AS build
WORKDIR /usr/src/evcs
RUN npm install --global bun@1.3.11 --registry=https://registry.npmmirror.com

COPY . .

# 编译期内联的前端公共变量（空串也可安全构建）
ARG PUBLIC_TIANDITU_TOKEN
ARG PUBLIC_AMAP_KEY
ARG PUBLIC_AMAP_SECURITY_JS_CODE
ENV PUBLIC_TIANDITU_TOKEN=${PUBLIC_TIANDITU_TOKEN} \
    PUBLIC_AMAP_KEY=${PUBLIC_AMAP_KEY} \
    PUBLIC_AMAP_SECURITY_JS_CODE=${PUBLIC_AMAP_SECURITY_JS_CODE}

RUN bun install --frozen-lockfile --filter @evcs/platform-web \
    && bun run --filter @evcs/platform-web build

# ---- 运行阶段：nginx 托管静态文件 ----
FROM ${NGINX_BASE_IMAGE} AS runtime
COPY ops/gitee-deploy/images/web-nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/evcs/apps/platform-web/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]