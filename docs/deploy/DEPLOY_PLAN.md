# Luminar Diamonds — 生产部署方案

**服务器**：jewelry.openhkt.com（阿里云，2核1.8GB）  
**SSH**：`ssh -i hkt.pem root@jewelry.openhkt.com`  
**更新日期**：2026-05-17

---

## 架构图

```
用户
 ↓
Nginx（80/443）
 ├── /         → Storefront（Node:3000）
 ├── /api      → Backend（Node:9000）
 └── /admin    → Backend（Node:9000，IP 白名单）

Storefront ←→ Backend ←→ Postgres + Redis
Backend    ←→ Meilisearch Cloud（外部）
```

## 服务内存分配

| 服务 | 限额 | 说明 |
|------|------|------|
| Postgres | 256 MB | 含 shared_buffers |
| Redis | 64 MB | maxmemory 48 MB |
| Backend | 600 MB | Medusa v2 Node.js |
| Storefront | 400 MB | Next.js standalone |
| Nginx | 32 MB | 静态代理 |
| 系统/其他 | ~100 MB | OS + SSH 等 |
| Swap | 4 GB | OOM 缓冲 |
| **总计** | **~1.45 GB** | 剩余 ~400 MB 余量 |

---

## 目录结构（服务器）

```
/opt/luminar/
├── infra/
│   ├── docker-compose.yml    ← 从仓库同步
│   ├── .env                  ← 手填，不入 git
│   └── nginx/
│       └── conf.d/
│           ├── api.conf
│           ├── admin.conf
│           └── storefront.conf
├── ssl/                      ← certbot 证书（接域名后）
└── logs/                     ← 各服务日志挂载
```

---

## CI/CD 流程

```
git push main
    ↓
GitHub Actions CI（lint + type-check + E2E）
    ↓
GitHub Actions Deploy
    ├── 构建 storefront Docker 镜像
    ├── 构建 backend Docker 镜像
    ├── 推送到 GHCR（ghcr.io/bradyliuy/luminar-*）
    └── SSH 到服务器
            ├── docker pull 新镜像
            ├── docker compose up backend（不停机）
            ├── medusa migrations run
            ├── docker compose up storefront
            └── 健康检查（失败自动回滚）
```

---

## 部署步骤

### Step 1：服务器初始化（一次性）

```bash
# 在本地执行
ssh -i docs/deploy/hkt.pem root@jewelry.openhkt.com 'bash -s' < docs/deploy/server-init.sh
```

### Step 2：填写环境变量

```bash
ssh -i docs/deploy/hkt.pem root@jewelry.openhkt.com
nano /opt/luminar/infra/.env
# 参考 infra/.env.example 填写所有变量
```

### Step 3：配置 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets → Actions 中添加：

| Secret 名 | 值 |
|-----------|-----|
| `DEPLOY_HOST` | `jewelry.openhkt.com` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | `cat docs/deploy/hkt.pem` 的内容 |

### Step 4：首次手动部署（拉镜像 + 初始化数据）

```bash
ssh -i docs/deploy/hkt.pem root@jewelry.openhkt.com
cd /opt/luminar

# 登录 GHCR（用 GitHub PAT，需要 read:packages 权限）
echo <GITHUB_PAT> | docker login ghcr.io -u bradyliuY --password-stdin

# 拉取镜像
docker compose -f infra/docker-compose.yml --env-file infra/.env pull

# 启动基础设施
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d postgres redis

# 等待数据库就绪（约 15 秒）
sleep 20

# 数据库迁移
docker compose -f infra/docker-compose.yml --env-file infra/.env run --rm backend \
  npx medusa migrations run

# 初始化数据（仅首次）
docker compose -f infra/docker-compose.yml --env-file infra/.env run --rm backend \
  npx medusa exec ./src/scripts/seed.ts
# 将输出的 pk_... 填入 infra/.env 的 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

# 启动所有服务
docker compose -f infra/docker-compose.yml --env-file infra/.env up -d
```

### Step 5：验证

```bash
# 内部健康检查
curl http://localhost/api/health    # → {"status":"ok"}
curl http://localhost/              # → HTML

# 公网访问
curl http://jewelry.openhkt.com/api/health
curl http://jewelry.openhkt.com/
```

---

## 日常运维命令

```bash
# 查看服务状态
docker compose -f /opt/luminar/infra/docker-compose.yml ps

# 查看日志
docker compose -f /opt/luminar/infra/docker-compose.yml logs -f storefront
docker compose -f /opt/luminar/infra/docker-compose.yml logs -f backend

# 重启单个服务
docker compose -f /opt/luminar/infra/docker-compose.yml restart storefront

# 查看内存使用
docker stats --no-stream

# 手动触发钻石同步
docker compose -f /opt/luminar/infra/docker-compose.yml exec backend \
  npx medusa exec ./src/jobs/sync-diamonds.ts
```
