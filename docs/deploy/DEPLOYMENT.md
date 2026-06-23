# Luminar 部署与访问手册

> 当前生产环境部署状态、架构、运维操作。最后更新：2026-05-17。

## 访问地址

| 用途 | URL | 凭证 |
|---|---|---|
| 网站 | https://jewelry.openhkt.com/ | — |
| Medusa Admin | https://jewelry.openhkt.com/admin/ | `admin@luminar.dev` / `Admin1234!` |
| Store API | https://jewelry.openhkt.com/store/* | publishable key（见 `.env.local`） |
| 服务器 SSH | `ssh -i docs/deploy/hkt.pem root@8.163.52.153` | — |

## 服务器规格

- IP: `8.163.52.153`（阿里云）
- 内存: 1.8 GB + 4 GB swap
- 系统: Linux 5.10（Alibaba Cloud Linux 8，**无 apt，用 yum/dnf**）

## 架构（混合：Docker 基础设施 + PM2 应用）

```
浏览器 ──► nginx (docker, --network host, 443)
              ├─ /                → PM2 storefront :3000   (Next.js)
              ├─ /api/*           → PM2 storefront :3000   (Next.js API routes)
              ├─ /store/*         → PM2 backend :9000      (Medusa store API)
              ├─ /auth/*          → PM2 backend :9000
              ├─ /admin/*         → PM2 backend :9000      (Medusa Admin UI)
              └─ /.well-known/    → /var/www/certbot       (ACME)

后端依赖：
  postgres:16-alpine   docker  127.0.0.1:24532  volume infra_postgres_data
  redis:7-alpine       docker  127.0.0.1:6379   (cache, 无持久化卷)
  Meilisearch SaaS     外部     ms-5957bf258d51-48052.sfo.meilisearch.io
```

### 为什么混合架构

- 服务器 1.8GB RAM，全 Docker 化 + 镜像构建容易 OOM
- `next build` / `medusa build` 的 Vite admin 步骤在服务器吃 2-3GB，本地构建后 rsync 更可靠
- 应用层直接跑 PM2（小内存占用，热重启快），基础设施容器化（postgres/redis 稳定）

## 部署流程（本地构建 → rsync）

### 1. 本地构建

```bash
# 安装依赖
pnpm install

# Backend（产出 apps/backend/dist/，含 admin 静态资源）
pnpm --filter @luminar/backend build
# Windows 注意：node_modules 里的 @medusajs/utils 需打 patch 移除默认 draft-order plugin
# 见 docs/deploy/DEPLOY_PLAN.md 的 "Windows 本地构建坑"

# Storefront（产出 apps/storefront/.next/）
# 注意：next.config.mjs 已注释掉 output: 'standalone'（Windows symlink 权限问题）
pnpm --filter @luminar/storefront build
```

### 2. 推到服务器

```bash
# Backend dist
cd apps/backend
tar czf - dist .medusa | ssh -i ../../docs/deploy/hkt.pem root@8.163.52.153 \
  "cd /opt/luminar/app/apps/backend && rm -rf dist .medusa && tar xzf -"

# Storefront .next + public
cd ../storefront
tar czf - .next public | ssh -i ../../docs/deploy/hkt.pem root@8.163.52.153 \
  "cd /opt/luminar/app/apps/storefront && rm -rf .next && tar xzf -"
```

### 3. 服务器侧重启

```bash
ssh -i docs/deploy/hkt.pem root@8.163.52.153
pm2 restart backend storefront
pm2 logs --lines 20  # 验证
```

### 4. 数据库迁移（仅当 schema 变化）

```bash
ssh -i docs/deploy/hkt.pem root@8.163.52.153
cd /opt/luminar/app/apps/backend/dist
npx medusa db:migrate
```

## 服务器侧文件位置

| 路径 | 说明 |
|---|---|
| `/opt/luminar/app/` | git checkout，pnpm install 后的整个 monorepo |
| `/opt/luminar/app/apps/backend/dist/` | Medusa build 产物（**`pm2 start` 的 cwd**） |
| `/opt/luminar/app/apps/storefront/.next/` | Next.js build 产物 |
| `/opt/luminar/app/apps/backend/.env` | 后端环境变量 |
| `/opt/luminar/app/apps/storefront/.env.local` | 前端环境变量 |
| `/opt/luminar/nginx-host/default.conf` | nginx 反代配置（bind mount 到容器） |
| `/opt/luminar/certbot/conf/` | Let's Encrypt 证书 |
| `/opt/luminar/certbot/www/` | ACME challenge webroot |
| `/opt/luminar/app/infra/docker-compose.yml` | postgres/redis 等容器编排（**nginx 服务未使用**，被替换为下方 host-network 容器） |

## 启动命令参考

### Postgres / Redis（docker compose）

```bash
cd /opt/luminar/app/infra
docker compose --env-file .env up -d postgres
# Redis 因要暴露端口给宿主，单独 run（compose 默认不映射端口）：
docker run -d --name infra-redis-1 --network infra_default --restart unless-stopped \
  -p 127.0.0.1:6379:6379 -m 64m redis:7-alpine \
  redis-server --requirepass <REDIS_PASSWORD> --maxmemory 48mb --maxmemory-policy allkeys-lru
```

### Backend / Storefront（PM2）

```bash
# 必须在 dist/ 目录启动 medusa（admin 静态资源在 dist/public/admin/）
pm2 start --name backend --cwd /opt/luminar/app/apps/backend/dist 'npx medusa start'
pm2 start --name storefront --cwd /opt/luminar/app/apps/storefront 'pnpm start' -- -p 3000

pm2 save              # 保存进程列表
pm2 startup           # 开机自启
```

### nginx（docker, host network）

```bash
docker run -d --name luminar-nginx --network host --restart unless-stopped -m 32m \
  -v /opt/luminar/nginx-host/default.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /opt/luminar/certbot/www:/var/www/certbot:ro \
  -v /opt/luminar/certbot/conf:/etc/letsencrypt:ro \
  nginx:alpine
```

⚠️ **改 `default.conf` 后必须 `docker restart luminar-nginx`**，不能用 `nginx -s reload`。
单文件 bind mount 在 `sed -i`（换 inode）后容器看到的是旧 inode，必须重启容器才能加载新文件。

## HTTPS 证书

```bash
# 首次签发
docker run --rm \
  -v /opt/luminar/certbot/conf:/etc/letsencrypt \
  -v /opt/luminar/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  --email bradyliuy@gmail.com --agree-tos --no-eff-email \
  -d jewelry.openhkt.com

# 续期（证书 90 天有效，建议加 cron）
docker run --rm \
  -v /opt/luminar/certbot/conf:/etc/letsencrypt \
  -v /opt/luminar/certbot/www:/var/www/certbot \
  certbot/certbot renew
docker restart luminar-nginx  # 续期后重启 nginx 才能用新证书
```

建议 cron（root crontab）：
```
0 3 * * 1 docker run --rm -v /opt/luminar/certbot/conf:/etc/letsencrypt -v /opt/luminar/certbot/www:/var/www/certbot certbot/certbot renew --quiet && docker restart luminar-nginx
```

## 常用运维命令

```bash
# 状态总览
pm2 status
docker ps
free -h && df -h

# 看日志
pm2 logs backend --lines 50
pm2 logs storefront --lines 50
docker logs luminar-nginx --tail 50
docker logs infra-postgres-1 --tail 50

# 重启某个应用（零停机）
pm2 reload backend       # 优先 reload（PM2 graceful），fork 模式下等价 restart
pm2 restart storefront

# DB 直连
docker exec -it infra-postgres-1 psql -U luminar -d luminar

# 全栈烟雾测试
for p in / /diamonds /rings /api/cart/count /store/regions /admin/; do
  echo "$(curl -so /dev/null -w '%{http_code}' https://jewelry.openhkt.com$p)  $p"
done
```

## 已知坑

1. **`@medusajs/draft-order` 强制注入**：Medusa v2 的 `defineConfig` 默认把 `@medusajs/draft-order` 加进 plugins，build 时 Vite 报 `defineRouteConfig is not exported`。
   修复：手动 patch `node_modules/.../@medusajs/utils/dist/common/define-config.js`，把 `defaultPlugins` 改为空 Map。本地和服务器都要做。

2. **Next.js standalone 在 Windows 失败**：`output: 'standalone'` 在 Windows 上 EPERM symlink。已在 `next.config.mjs` 注释掉，改用 `next start` + 完整 node_modules。

3. **`medusa start` 必须在 `dist/` 下运行**：admin 静态资源在 `dist/public/admin/index.html`，从仓库根目录跑会 404。

4. **Redis 容器需暴露 host 端口**：原 compose 没映射 redis 端口（设计为应用也跑容器内）。当前 PM2 跑在宿主，必须 `-p 127.0.0.1:6379:6379`。

5. **改 nginx conf 必须 `docker restart`**：见上方 nginx 章节。

## 凭证清单

| 服务 | 位置 |
|---|---|
| Server SSH key | `docs/deploy/hkt.pem` |
| Medusa admin | `admin@luminar.dev` / `Admin1234!` |
| Postgres | `luminar` / `7c7394ca722811ce8ade5eae32c469d8`（`/opt/luminar/app/apps/backend/.env`） |
| Redis | `4c6f317cc6d0bfa63b9108a1` |
| Meilisearch / Stripe / publishable key | `apps/storefront/.env.local` |
