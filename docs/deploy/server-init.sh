#!/bin/bash
# =============================================================
# Luminar Diamonds — 服务器初始化脚本
# 服务器：8.163.52.153（2核 1.8GB）
# 执行：ssh -i hkt.pem root@8.163.52.153 'bash -s' < server-init.sh
# =============================================================
set -euo pipefail

echo "=========================================="
echo "  Luminar 服务器初始化"
echo "=========================================="

# ---------- 1. 系统更新 ----------
echo "[1/8] 更新系统包..."
yum update -y 2>/dev/null || apt-get update -y 2>/dev/null || true

# ---------- 2. 安装基础工具 ----------
echo "[2/8] 安装基础工具..."
if command -v yum &>/dev/null; then
  yum install -y curl wget git vim htop net-tools
else
  apt-get install -y curl wget git vim htop net-tools
fi

# ---------- 3. 添加 4GB Swap ----------
echo "[3/8] 配置 Swap（4GB）..."
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # 优化 swap 使用策略（只在内存紧张时用 swap）
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
  echo "  Swap 已创建：$(free -h | grep Swap)"
else
  echo "  Swap 已存在，跳过"
fi

# ---------- 4. 安装 Docker ----------
echo "[4/8] 安装 Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "  Docker 版本：$(docker --version)"
else
  echo "  Docker 已安装：$(docker --version)"
fi

# ---------- 5. 安装 Docker Compose Plugin ----------
echo "[5/8] 安装 Docker Compose..."
if ! docker compose version &>/dev/null; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  echo "  Docker Compose 版本：$(docker compose version)"
else
  echo "  Docker Compose 已安装：$(docker compose version)"
fi

# ---------- 6. 创建目录结构 ----------
echo "[6/8] 创建目录结构..."
mkdir -p /opt/luminar/infra/nginx/conf.d
mkdir -p /opt/luminar/infra/nginx/ssl
mkdir -p /opt/luminar/logs

# ---------- 7. 复制 Nginx 配置 ----------
echo "[7/8] 写入 Nginx 配置..."

cat > /opt/luminar/infra/nginx/conf.d/api.conf << 'NGINX_API'
server {
    listen 80;
    server_name _;

    client_max_body_size 50m;

    location /api/ {
        proxy_pass       http://backend:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /admin/ {
        proxy_pass       http://backend:9000/admin/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # IP 白名单（生产时限制管理后台访问）
        # allow 你的IP;
        # deny all;
    }

    location / {
        proxy_pass         http://storefront:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_API

# ---------- 8. 写入 .env 模板 ----------
echo "[8/8] 写入 .env 模板..."
if [ ! -f /opt/luminar/infra/.env ]; then
  cat > /opt/luminar/infra/.env << 'ENV_TEMPLATE'
# ============================================================
# 填写说明：替换所有 "替换为..." 的值后保存
# ============================================================

DOMAIN=8.163.52.153
STORE_CORS=http://8.163.52.153
ADMIN_CORS=http://8.163.52.153
NEXT_PUBLIC_MEDUSA_URL=http://8.163.52.153/api

POSTGRES_PASSWORD=替换为强密码_至少16位
REDIS_PASSWORD=替换为强密码

JWT_SECRET=替换为随机字符串_openssl_rand_base64_32
COOKIE_SECRET=替换为随机字符串_openssl_rand_base64_32

STRIPE_SECRET_KEY=sk_test_替换
STRIPE_PUBLISHABLE_KEY=pk_test_替换
STRIPE_WEBHOOK_SECRET=whsec_替换

NIVODA_CLIENT_ID=
NIVODA_CLIENT_SECRET=

MEILISEARCH_HOST=https://ms-替换.sfo.meilisearch.io
MEILISEARCH_API_KEY=替换_Admin_Key
MEILISEARCH_SEARCH_KEY=替换_Search_Key

RESEND_API_KEY=re_替换
RESEND_AUDIENCE_ID=

ANTHROPIC_API_KEY=sk-ant-替换

CLOUDINARY_URL=
SANITY_PROJECT_ID=
SANITY_TOKEN=
REVALIDATE_SECRET=替换随机字符串

NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=待seed后填入
POSTHOG_KEY=
SENTRY_DSN=
ENV_TEMPLATE
  echo "  .env 模板已写入 /opt/luminar/infra/.env"
  echo "  ⚠️  请编辑并填写真实值：nano /opt/luminar/infra/.env"
else
  echo "  .env 已存在，跳过"
fi

echo ""
echo "=========================================="
echo "  初始化完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 填写环境变量：  nano /opt/luminar/infra/.env"
echo "  2. 配置 GitHub Secrets（DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY）"
echo "  3. push 代码触发 GitHub Actions 构建并部署"
echo ""
echo "内存状态："
free -h
echo ""
echo "Swap 状态："
swapon --show
echo ""
echo "Docker 状态："
docker info | grep -E "Server Version|Operating System"
