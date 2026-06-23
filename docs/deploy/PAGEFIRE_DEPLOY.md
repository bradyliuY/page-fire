# PageFire 部署手册(与 Luminar 同机共存)

> PageFire 静态发布服务部署在 **Luminar 同一台阿里云服务器**上,复用现有 nginx 作唯一入口。
> 最后更新:2026-06-23。架构设计见 `docs/design.md`。

## 0. 一句话架构

```
浏览器
 └─► nginx (docker, host network, 80/443)  ── 唯一入口,Luminar 已在跑
       ├─ jewelry.openhkt.com/*           → Luminar(现有,完全不动)
       ├─ mcp.pagefire.openhkting.com/*    → proxy_pass 127.0.0.1:4100  (MCP 写入面,Bearer token)
       └─ *.pagefire.openhkting.com/*      → proxy_pass 127.0.0.1:4000  (对外只读静态面)
                                               PageFire 进程
PageFire 进程(Node/TS,PM2 托管,与 Luminar 的 backend/storefront 同一 PM2):
   ├─ MCP Server :4100     ← 只绑 127.0.0.1,Streamable HTTP,Bearer token 鉴权;本地 Claude/IDE 连它发布
   ├─ HTTP 静态服务 :4000  ← 只绑 127.0.0.1,nginx 反代;按 Host 头解析子域名
   │                         查 SQLite 反查目录 → serve 静态文件 + 注入安全头
   ├─ SQLite(better-sqlite3,WAL)
   └─ CLI: pagefire token / gc

数据目录:/var/pagefire/sites/<token_id>/<did>/   纯静态,只读对外
        /var/pagefire/pagefire.db                SQLite 元数据
```

服务器信息(同 Luminar):IP `8.163.52.153`,Alibaba Cloud Linux 8(**无 apt,用 yum/dnf**),1.8GB + 4GB swap。
SSH:`ssh -i docs/deploy/hkt.pem root@8.163.52.153`。

⚠️ **内存余量仅 ~400MB**:PageFire 纯静态 + 单 Node 进程,正常 ~100–150MB。务必给 PM2 设内存上限(见 §4),并盯 `free -h`。

---

## 1. 域名配置(★ 你需要在阿里云控制台做的事)

根域名 `openhkting.com` 托管在**阿里云 DNS**。需要做两件事:

### 1.1 加一条泛解析 A 记录(必须)

阿里云控制台 → **云解析 DNS** → 选择域名 `openhkting.com` → **解析设置** → **添加记录**:

| 字段 | 填写值 |
|---|---|
| 记录类型 | `A` |
| 主机记录 | `*.pagefire` |
| 解析线路 | 默认 |
| 记录值 | `8.163.52.153` |
| TTL | 600(默认即可) |

效果:任意 `<did>--<space_id>.pagefire.openhkting.com` 和 `<space_id>.pagefire.openhkting.com` 都解析到服务器。

> 可选:再加一条主机记录 `pagefire`(类型 A,值同上),让裸的 `pagefire.openhkting.com` 也能访问(用于落地页/健康检查)。

验证(本地):
```bash
nslookup test123.pagefire.openhkting.com   # 应返回 8.163.52.153
```

### 1.2 创建一个 RAM 子账号 AccessKey 供通配证书自动签发(必须)

通配证书 `*.pagefire.openhkting.com` **只能用 DNS-01 验证**(需往 DNS 加 TXT 记录),所以 acme.sh 需要阿里云 API 凭证自动加/删 TXT。

阿里云控制台 → **RAM 访问控制** → **用户** → 创建用户(仅编程访问)→ 记录 **AccessKey ID / Secret**;给该用户授权 **`AliyunDNSFullAccess`**(或更小:仅 `openhkting.com` 的解析读写)。

把这对 Key 交给运维(我),填入 §3 的 acme.sh 环境变量。**不要进 git**。

> 至此你侧的操作就完成了。剩下 §2–§6 是服务器侧部署,由运维执行。

---

## 2. 服务器侧:目录与代码

```bash
ssh -i docs/deploy/hkt.pem root@8.163.52.153

# 数据目录(纯静态 + SQLite),收紧权限
mkdir -p /var/pagefire/sites
# 代码目录
mkdir -p /opt/pagefire
```

把 PageFire 仓库构建产物部署到 `/opt/pagefire`(本地构建 → rsync,或服务器 `git pull && pnpm i && pnpm build`,参照 Luminar 习惯)。Node 版本与 Luminar 对齐。

环境变量 `/opt/pagefire/.env`(示例):
```
PAGEFIRE_DB=/var/pagefire/pagefire.db
PAGEFIRE_SITES=/var/pagefire/sites
PAGEFIRE_HTTP_HOST=127.0.0.1
PAGEFIRE_HTTP_PORT=4000          # 对外只读静态面
PAGEFIRE_MCP_PORT=4100          # MCP 写入面(经 mcp.pagefire 子域名 + Bearer token)
PAGEFIRE_BASE_DOMAIN=pagefire.openhkting.com
```

首次初始化 SQLite + 生成第一个 token:
```bash
cd /opt/pagefire
node dist/cli.js token create --slug brady --label "自用"
#   → 打印一次性明文 pf_xxx(立即保存)+ 对应 space_id / 域名
```

---

## 3. 通配证书(acme.sh + 阿里云 DNS-01)

证书放进 Luminar nginx 容器已挂载的目录 `/opt/luminar/certbot/conf`(容器内即 `/etc/letsencrypt`),无需改 nginx 的 `docker run` 参数。

```bash
# 安装 acme.sh(若未装)
curl https://get.acme.sh | sh -s email=bradyliuy@gmail.com

# 填入 §1.2 的 RAM AccessKey
export Ali_Key="LTAI_你的AccessKeyId"
export Ali_Secret="你的AccessKeySecret"

# 签发通配证书(自动加 TXT 验证,完成后自动删)
~/.acme.sh/acme.sh --issue --dns dns_ali \
  -d pagefire.openhkting.com -d '*.pagefire.openhkting.com'

# 安装到 nginx 可读目录,并设置续期后自动重启 nginx
mkdir -p /opt/luminar/certbot/conf/pagefire
~/.acme.sh/acme.sh --install-cert -d pagefire.openhkting.com \
  --key-file       /opt/luminar/certbot/conf/pagefire/key.pem \
  --fullchain-file /opt/luminar/certbot/conf/pagefire/fullchain.pem \
  --reloadcmd      "docker restart luminar-nginx"
```

> acme.sh 安装时会自动写入 cron 每天检查、到期自动续期并执行 reloadcmd,无需手配续期。
> 备选 certbot:需第三方插件 `certbot-dns-aliyun`,较繁琐,推荐 acme.sh。

---

## 4. PageFire 进程(PM2)

```bash
cd /opt/pagefire
# --max-memory-restart 防止异常占满本就紧张的内存
pm2 start dist/index.js --name pagefire \
  --cwd /opt/pagefire --max-memory-restart 200M

pm2 save        # 写入进程列表(与 Luminar backend/storefront 一起)
pm2 status      # 确认 pagefire online
curl -s http://127.0.0.1:4000/healthz   # 本机健康检查 → ok
```

MCP 接入(本地 Claude/IDE):服务器在远端,**不能用 stdio**。MCP 走 Streamable HTTP,经 nginx 暴露在 `mcp.pagefire.openhkting.com`,本地客户端配置该 URL + Bearer token:

```jsonc
// claude_desktop_config.json(或 IDE 的 MCP 配置)
{
  "mcpServers": {
    "pagefire": {
      "url": "https://mcp.pagefire.openhkting.com/mcp",
      "headers": { "Authorization": "Bearer pf_你的token" }
    }
  }
}
```

---

## 5. nginx:新增 *.pagefire server 块

当前 nginx 配置是单文件 bind mount `/opt/luminar/nginx-host/default.conf`。把下面的 server 块**追加**进该文件(Luminar 原有内容保持不动):

```nginx
# ---- PageFire: *.pagefire.openhkting.com ----
server {
    listen 80;
    server_name *.pagefire.openhkting.com pagefire.openhkting.com;
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name *.pagefire.openhkting.com pagefire.openhkting.com;

    ssl_certificate     /etc/letsencrypt/pagefire/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/pagefire/key.pem;

    client_max_body_size 50m;

    # host network 模式下,容器可直接访问宿主 127.0.0.1:4000
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host              $host;   # ★ 必须透传,PageFire 靠它解析子域名
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ---- PageFire MCP 写入面(精确 server_name 优先于上面的通配)----
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name mcp.pagefire.openhkting.com;   # 同一张通配证书已覆盖,无需单独证书

    ssl_certificate     /etc/letsencrypt/pagefire/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/pagefire/key.pem;

    client_max_body_size 50m;   # zip_base64 发布可能较大

    location / {
        proxy_pass http://127.0.0.1:4100;       # MCP 端口,Bearer token 由 PageFire 校验
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;                  # Streamable HTTP / SSE 需要
        proxy_set_header Connection "";
        proxy_read_timeout 3600s;                # 长连接
    }
}
```

> `mcp.pagefire.openhkting.com` 已被 §1 的泛解析 A 记录和通配证书覆盖,**无需额外加 DNS 或证书**;nginx 中精确 `server_name` 自动优先于 `*.pagefire`。

应用配置:
```bash
docker restart luminar-nginx   # ⚠️ 改单文件 bind mount 后必须 restart,不能 reload(见 Luminar DEPLOYMENT.md)
docker logs luminar-nginx --tail 20
```

---

## 6. 定时清理过期发布(cron)

```bash
# root crontab,每天 4 点清理未 pin 且过期的 deployment
0 4 * * * cd /opt/pagefire && node dist/cli.js gc >> /var/log/pagefire-gc.log 2>&1
```

---

## 7. 验证(端到端)

```bash
# 1) DNS
nslookup demo--abcdef.pagefire.openhkting.com      # → 8.163.52.153

# 2) 证书 + nginx → PageFire
curl -sI https://demo--abcdef.pagefire.openhkting.com/   # 200 或 404(证书有效即说明链路通)

# 3) 用 MCP 发一个页面后,访问返回的 url 应 200 且显示内容
# 4) 确认没影响 Luminar
curl -so /dev/null -w '%{http_code}\n' https://jewelry.openhkt.com/   # 仍 200
```

---

## 8. 常用运维

```bash
pm2 status && pm2 logs pagefire --lines 50
free -h && df -h                         # 盯内存/磁盘(余量紧张)
node /opt/pagefire/dist/cli.js token list
node /opt/pagefire/dist/cli.js token rotate --slug brady   # 链接泄漏时轮换 space_id
node /opt/pagefire/dist/cli.js gc                          # 手动清理过期
~/.acme.sh/acme.sh --list                                 # 查证书到期
docker restart luminar-nginx             # 改 nginx conf 后
```

## 9. 凭证清单

| 项 | 位置 |
|---|---|
| 服务器 SSH key | `docs/deploy/hkt.pem` |
| 阿里云 DNS RAM AccessKey | 仅 acme.sh 环境变量,不入 git |
| PageFire token(pf_xxx) | 仅生成时打印一次,存哈希;明文自行保管 |
| 通配证书 | `/opt/luminar/certbot/conf/pagefire/` |

## 10. 与 Luminar 共存须知

- **不动 Luminar**:不改它的 server 块、PM2 进程、docker 容器;只往 nginx 追加 server、往 PM2 加一个进程、往 certbot 目录加一套证书。
- **端口**:80/443 归 nginx;PageFire 的 4000 与 MCP 端口只绑 `127.0.0.1`,不与 Luminar(3000/9000)冲突。
- **内存**:两项目共用 1.8GB。若后续 PageFire 流量上来,优先升级阿里云实例到 4GB,而非压缩 Luminar。
