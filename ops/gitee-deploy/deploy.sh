#!/usr/bin/env bash
# ===========================================================================
# Gitee Go 主机端部署脚本：dev / test / prod 三环境一键部署
# 由 Gitee Go 流水线的 deploy@host 在目标主机上调用：
#   bash ops/gitee-deploy/deploy.sh <dev|test|prod>
#
# 流程：切分支 → 建库(如不存在) → 迁移 → 构建并启动 compose
# 前置：目标主机已安装 bun / docker / docker compose，并配置好仓库的 git 凭据
# ===========================================================================
set -euo pipefail

ENV_NAME="${1:?usage: deploy.sh <dev|test|prod>}"

case "$ENV_NAME" in
  dev)  ENV_BRANCH="${ENV_NAME}" ;;
  test) ENV_BRANCH="${ENV_NAME}" ;;
  prod) ENV_BRANCH="main"        ;;
  *)    echo "unsupported env: $ENV_NAME (expected dev|test|prod)" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# 1) 切到对应分支并拉取最新代码
git fetch origin --prune
git checkout "$ENV_BRANCH"
git pull origin "$ENV_BRANCH"

# 2) 载入本环境变量文件（主机上 ops/gitee-deploy/.env.<env>，不入库）
ENV_FILE="ops/gitee-deploy/.env.${ENV_NAME}"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "ops/gitee-deploy/.env.${ENV_NAME}.example" "$ENV_FILE"
  echo "首次部署：已生成 $ENV_FILE，请填写真实凭据与域名后重新运行本脚本" >&2
  exit 1
fi
set -a; source "$ENV_FILE"; set +a
: "${MYSQL_HOST:?MYSQL_HOST required}"

# 3) 确保分库存在（共享 MySQL 实例）
echo "[deploy:${ENV_NAME}] ensure database '${MYSQL_DATABASE}' exists"
bun -e 'import mysql from "mysql2/promise";const c=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT??3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD});await c.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);await c.end();'

# 4) 数据库迁移（对当前环境分库执行）
if [[ -z "${SKIP_MIGRATE:-}" ]]; then
  export EVCS_DATABASE_URL="mysql2://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT:-3306}/${MYSQL_DATABASE}"
  export EVCS_MIGRATION_SCOPE="${EVCS_MIGRATION_SCOPE:-all}"
  echo "[deploy:${ENV_NAME}] migrate -> ${MYSQL_DATABASE} (${EVCS_MIGRATION_SCOPE})"
  bun --no-env-file ops/database/migrate.ts
fi

# 5) 构建并启动
echo "[deploy:${ENV_NAME}] docker compose up"
docker compose -f ops/gitee-deploy/compose.yaml --env-file "$ENV_FILE" up -d --build

echo "[deploy:${ENV_NAME}] done."