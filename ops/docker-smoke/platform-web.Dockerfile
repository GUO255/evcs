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

RUN bun install --frozen-lockfile --filter @evcs/platform-web --filter @evcs/geo-coordinates

COPY tsconfig.json tsconfig.json
COPY apps/platform-web apps/platform-web
COPY packages/geo-coordinates packages/geo-coordinates
COPY ops/environment ops/environment
COPY ops/.env.production ops/.env.production

ARG PUBLIC_TIANDITU_TOKEN
ARG PUBLIC_AMAP_KEY
ARG PUBLIC_AMAP_SECURITY_JS_CODE

ENV PUBLIC_TIANDITU_TOKEN=${PUBLIC_TIANDITU_TOKEN} \
    PUBLIC_AMAP_KEY=${PUBLIC_AMAP_KEY} \
    PUBLIC_AMAP_SECURITY_JS_CODE=${PUBLIC_AMAP_SECURITY_JS_CODE}

RUN bun ops/environment/scripts/materialize-runtime-env.ts \
      --profile production \
      --role platform-web-build \
      --output-dir /runtime-env \
    && bun --no-env-file --env-file=/runtime-env/production.platform-web-build.env \
      run --filter @evcs/platform-web build

FROM registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim AS runtime

WORKDIR /srv

RUN npm install --global bun@1.3.11 --registry=https://registry.npmmirror.com

COPY --from=build /usr/src/evcs/apps/platform-web/dist ./dist
COPY ops/docker-smoke/serve-static.ts ./serve-static.ts

EXPOSE 8080

CMD ["bun", "--no-env-file", "serve-static.ts"]
