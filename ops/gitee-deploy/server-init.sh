#!/usr/bin/env bash
# ===========================================================================
# EVCS 服务器一键初始化脚本（Ubuntu 22.04 / 24.04）
#
# 在全新腾讯云轻量服务器上以 root 执行：
#   curl -fsSL https://raw.githubusercontent.com/GUO255/evcs/dev/ops/gitee-deploy/server-init.sh | bash
#   或（手动方式）：
#   chmod +x server-init.sh && ./server-init.sh
#
# 完成内容：
#   1. 安装 git / curl / unzip
#   2. 安装 Docker + Docker Compose 插件
#   3. 安装 Bun
#   4. 生成 SSH 部署密钥（用于 GitHub Actions SSH 登录 + 拉取仓库）
#   5. 创建部署目录 /opt/evcs-dev
#   6. 输出需要你手动操作的信息
# ===========================================================================
set -euo pipefail

DEPLOY_USER="${SUDO_USER:-root}"
DEPLOY_HOME="$(eval echo "~${DEPLOY_USER}")"
SSH_DIR="${DEPLOY_HOME}/.ssh"
KEY_NAME="evcs_deploy"
KEY_PATH="${SSH_DIR}/${KEY_NAME}"
WORK_DIR="/opt/evcs-dev"
REPO_HTTPS="https://github.com/GUO255/evcs.git"
REPO_SSH="git@github.com:GUO255/evcs.git"

echo "========================================"
echo " EVCS 服务器初始化"
echo " 用户: ${DEPLOY_USER}"
echo " 主目录: ${DEPLOY_HOME}"
echo "========================================"

# ---------- 1. 系统依赖 ----------
echo ""
echo "[1/6] 安装系统依赖 (git / curl / unzip)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl unzip ca-certificates >/dev/null

# ---------- 2. Docker ----------
echo ""
echo "[2/6] 安装 Docker + Docker Compose..."
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null

  # 允许当前用户免 sudo 使用 docker
  if [ "${DEPLOY_USER}" != "root" ]; then
    usermod -aG docker "${DEPLOY_USER}"
  fi
  systemctl enable --now docker
else
  echo "  Docker 已安装，跳过"
fi
docker --version
docker compose version

# ---------- 3. Bun ----------
echo ""
echo "[3/6] 安装 Bun..."
if ! command -v bun &>/dev/null; then
  BUN_INSTALL="${DEPLOY_HOME}/.bun" bash -c \
    'curl -fsSL https://bun.sh/install | bash'
  # 链接到 /usr/local/bin 以便全局可用
  ln -sf "${DEPLOY_HOME}/.bun/bin/bun" /usr/local/bin/bun
else
  echo "  Bun 已安装，跳过"
fi
bun --version

# ---------- 4. SSH 部署密钥 ----------
echo ""
echo "[4/6] 生成 SSH 部署密钥..."
mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"

if [ -f "${KEY_PATH}" ]; then
  echo "  密钥已存在: ${KEY_PATH}，跳过生成"
else
  ssh-keygen -t ed25519 -N "" -C "evcs-deploy@$(hostname)" -f "${KEY_PATH}"
  echo "  已生成: ${KEY_PATH}"
fi

# 公钥加入 authorized_keys（让 GitHub Actions 能 SSH 登录）
PUB_KEY="$(cat "${KEY_PATH}.pub")"
AUTH_KEYS="${SSH_DIR}/authorized_keys"
touch "${AUTH_KEYS}"
chmod 600 "${AUTH_KEYS}"
if ! grep -qF "${PUB_KEY}" "${AUTH_KEYS}" 2>/dev/null; then
  echo "${PUB_KEY}" >> "${AUTH_KEYS}"
  echo "  公钥已加入 ${AUTH_KEYS}"
else
  echo "  公钥已在 ${AUTH_KEYS} 中"
fi

# 配置 SSH 使用该密钥访问 github.com
SSH_CONFIG="${SSH_DIR}/config"
touch "${SSH_CONFIG}"
chmod 600 "${SSH_CONFIG}"
if ! grep -q "Host github.com" "${SSH_CONFIG}" 2>/dev/null; then
  cat >> "${SSH_CONFIG}" <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile ${KEY_PATH}
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
  echo "  已配置 SSH config 使用 ${KEY_NAME} 访问 github.com"
fi

chown -R "${DEPLOY_USER}:" "${SSH_DIR}" 2>/dev/null || true

# ---------- 5. 克隆仓库 & 生成 .env.dev ----------
echo ""
echo "[5/6] 克隆仓库 & 生成环境配置..."

# 自动检测公网 IP
SERVER_IP="$(curl -fsSL --max-time 5 https://api.ipify.org 2>/dev/null || echo "YOUR_SERVER_IP")"

if [ ! -d "${WORK_DIR}/.git" ]; then
  git clone --branch dev "${REPO_HTTPS}" "${WORK_DIR}"
  echo "  仓库已克隆到 ${WORK_DIR}"
else
  echo "  仓库已存在，拉取最新代码..."
  cd "${WORK_DIR}"
  git pull origin dev
  cd -
fi

chown -R "${DEPLOY_USER}:" "${WORK_DIR}" 2>/dev/null || true

# 生成 .env.dev（随机密码）
ENV_FILE="${WORK_DIR}/ops/gitee-deploy/.env.dev"
if [ ! -f "${ENV_FILE}" ]; then
  MYSQL_PWD="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
  MYSQL_ROOT_PWD="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 28)"

  cat > "${ENV_FILE}" <<EOF
# 开发环境 (dev) - 由 server-init.sh 自动生成
ENV_NAME=dev

# ---- 共享 MySQL（Docker 容器内）----
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_USER=evcs
MYSQL_PASSWORD=${MYSQL_PWD}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PWD}
MYSQL_DATABASE=evcs_dev

# ---- 主机暴露端口 ----
WEB_PORT=8081
PLATFORM_PORT=3230
CHARGING_PORT=3241

# ---- 前端编译期变量 ----
PUBLIC_TIANDITU_TOKEN=
PUBLIC_AMAP_KEY=
PUBLIC_AMAP_SECURITY_JS_CODE=

# ---- 应用运行变量 ----
AUTH_PLATFORM_WEB_ORIGIN=http://${SERVER_IP}:8081
EOF

  chown "${DEPLOY_USER}:" "${ENV_FILE}" 2>/dev/null || true
  echo "  已生成 ${ENV_FILE}"
  echo "  MySQL 用户密码: ${MYSQL_PWD}"
  echo "  MySQL root 密码: ${MYSQL_ROOT_PWD}"
else
  echo "  ${ENV_FILE} 已存在，跳过"
fi

# ---------- 6. 完成提示 ----------
echo ""
echo "========================================"
echo " 初始化完成！"
echo "========================================"
echo ""
echo "【需要你在 GitHub 上配置 Secrets】"
echo "  打开: https://github.com/GUO255/evcs/settings/secrets/actions"
echo ""
echo "  逐个添加以下 5 个 Secret："
echo ""
echo "  1) Name: DEV_HOST"
echo "     Value: ${SERVER_IP}"
echo ""
echo "  2) Name: DEV_USER"
echo "     Value: ${DEPLOY_USER}"
echo ""
echo "  3) Name: DEV_SSH_PORT"
echo "     Value: 22"
echo ""
echo "  4) Name: DEV_WORK_DIR"
echo "     Value: ${WORK_DIR}"
echo ""
echo "  5) Name: DEV_SSH_KEY"
echo "     Value: 粘贴下面的完整私钥（包含 BEGIN/END 行）："
echo ""
cat "${KEY_PATH}"
echo ""
echo "========================================"
echo " 配置完 Secrets 后，推送代码到 dev 分支"
echo " 即可自动触发部署。"
echo " 部署完成后访问: http://${SERVER_IP}:8081"
echo "========================================"
