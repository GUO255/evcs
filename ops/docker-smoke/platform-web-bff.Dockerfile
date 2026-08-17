FROM registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim AS build

WORKDIR /usr/src/evcs

RUN npm install --global bun@1.3.11 --registry=https://registry.npmmirror.com

COPY package.json package.json
COPY bun.lock bun.lock
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/auth-web/package.json apps/auth-web/package.json
COPY apps/platform-service/package.json apps/platform-service/package.json
COPY apps/platform-web-bff/package.json apps/platform-web-bff/package.json
COPY apps/platform-web/package.json apps/platform-web/package.json
COPY apps/site-selection-service/package.json apps/site-selection-service/package.json
COPY apps/site-selection-v2-service/package.json apps/site-selection-v2-service/package.json
COPY apps/site-selection-web/package.json apps/site-selection-web/package.json
COPY packages/geo-coordinates/package.json packages/geo-coordinates/package.json

RUN bun install --frozen-lockfile --filter @evcs/platform-web-bff

COPY apps/platform-web-bff apps/platform-web-bff

FROM registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim AS runtime

WORKDIR /srv

RUN npm install --global bun@1.3.11 --registry=https://registry.npmmirror.com

COPY --from=build /usr/src/evcs/node_modules ./node_modules
COPY --from=build /usr/src/evcs/apps/platform-web-bff ./apps/platform-web-bff

EXPOSE 3240

CMD ["bun", "--no-env-file", "apps/platform-web-bff/src/index.ts"]
