# PageFire 部署指南

把 PageFire 部署到你自己的 Linux 服务器,对外提供 `*.pagefire.yourdomain.com` 静态发布 + `mcp.pagefire.yourdomain.com` MCP 写入面。

> 本文全部使用占位符(`your-server-ip`、`yourdomain.com`、`pf_xxx` 等),请替换成你自己的值。含真实 IP / 凭证的私有手册请只保留在本地(放 `docs/deploy/`,不入库)。

## 架构一图

```
                          ┌─ *.pagefire.yourdomain.com ─┐  (只读静态面)
  公网 ── nginx(TLS) ──┤                              │→ 127.0.0.1:4000
        443             └─ mcp.pagefire.yourdomain.com ─┘  (MCP 写入面,Bearer 鉴权)
                                                          → 127.0.0.1:4100
  数据:/var/pagefire/{sites/<token_id>/<did>/, pagefire.db}
  代码:/opt/pagefire/{dist, node_modules, .env}
```

- **纯静态**,服务器侧绝不执行用户代码;用户 JS 只在访客浏览器跑。
- 两个内部端口都只绑 `127.0.0.1`,只能经 nginx 出去。
- 每个部署挂在**独立子域名根**,HTML/zip 里的绝对路径 `/css/x.css` 天然正确。

## 前置要求

- 一台 Linux 服务器(本指南以 RHEL 系 / Alibaba Cloud Linux 为例,用 `dnf`;Debian 系把 `dnf` 换成 `apt`)
- 一个你能改 DNS 的域名(本文以阿里云 DNS 为例做 DNS-01 自动签发)
- Node.js ≥ 20、pnpm、nginx、git
- 内存紧张的小机器请给 PM2 设 `--max-memory-restart`(见下)

```bash
# Node 20 + pnpm(示例)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs nginx git
npm i -g pnpm pm2
```

## 1. DNS:一条泛解析

给 PageFire 用的所有子域名(`<did>-<space_id>.pagefire`、`mcp.pagefire`)都被一条泛解析覆盖:

```
类型   主机记录            记录值
A      *.pagefire          your-server-ip
```

`mcp.pagefire.yourdomain.com` 也被这条 `*.pagefire` 覆盖,无需单独加。

## 2. 通配证书(acme.sh + 阿里云 DNS-01)

通配证书 `*.pagefire.yourdomain.com` 用 acme.sh 的 `dns_ali`(阿里云 DNS API,需 RAM 子账号 AccessKey)自动签发与续期:

```bash
curl https://get.acme.sh | sh -s email=you@example.com
export Ali_Key="your-ram-accesskey-id"
export Ali_Secret="your-ram-accesskey-secret"

~/.acme.sh/acme.sh --issue --dns dns_ali -d 'pagefire.yourdomain.com' -d '*.pagefire.yourdomain.com'

# 安装到一个固定路径,reloadcmd 让 nginx 续期后自动加载
mkdir -p /etc/letsencrypt/pagefire
~/.acme.sh/acme.sh --install-cert -d 'pagefire.yourdomain.com' \
  --fullchain-file /etc/letsencrypt/pagefire/fullchain.pem \
  --key-file      /etc/letsencrypt/pagefire/key.pem \
  --reloadcmd     'nginx -s reload'
```

acme.sh 会自己装好 cron,到期自动续期。

## 3. 部署代码

代码与数据分离:代码在 `/opt/pagefire`,数据在 `/var/pagefire`。

```bash
git clone https://github.com/bradyliuY/page-fire.git /opt/pagefire
cd /opt/pagefire
pnpm install
pnpm build              # tsc → dist/

mkdir -p /var/pagefire/sites
```

## 4. 环境变量

```bash
cp .env.example /opt/pagefire/.env
```

按需修改 `/opt/pagefire/.env`:

| 变量 | 说明 | 生产示例 |
|------|------|----------|
| `PAGEFIRE_DB` | SQLite 路径 | `/var/pagefire/pagefire.db` |
| `PAGEFIRE_SITES` | 静态文件目录 | `/var/pagefire/sites` |
| `PAGEFIRE_HTTP_HOST` | 绑定地址 | `127.0.0.1` |
| `PAGEFIRE_HTTP_PORT` | 静态服务端口 | `4000` |
| `PAGEFIRE_MCP_PORT` | MCP 端口 | `4100` |
| `PAGEFIRE_BASE_DOMAIN` | 基础域名 | `pagefire.yourdomain.com` |
| `PAGEFIRE_RATE_LIMIT` | 每分钟请求上限 | `30` |

> SQLite 开 WAL,支持 MCP / HTTP / CLI 多连接读写;数据库会在首次启动时自动建表。

## 5. 创建第一个 Token(CLI)

```bash
cd /opt/pagefire
node dist/cli/index.js token create --slug myspace --label "我的空间"
# 输出 pf_xxx 密钥 + space_id,密钥只显示一次,妥善保存
node dist/cli/index.js token list
```

（也可以不在这里建:启动后在 Web 控制台 `https://pagefire.yourdomain.com` 注册账号自助创建。)

## 6. nginx:追加两个 server 块

如果你这台机器已经在跑 nginx(PageFire 的设计就是与现有服务共存),**只往现有 nginx 追加** server 块,不要动别人的配置。TLS 在 nginx 终止,反代到本地 4000 / 4100。

```nginx
# ── 静态发布面:所有 *.pagefire 子域名 → 4000 ──
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.pagefire.yourdomain.com pagefire.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/pagefire/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/pagefire/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ── MCP 写入面:mcp.pagefire → 4100(Bearer 鉴权在应用层做) ──
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mcp.pagefire.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/pagefire/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/pagefire/key.pem;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";       # 支持 Streamable HTTP(SSE)
        proxy_read_timeout 3600s;
    }
}

# 80 → 443 跳转(可选)
server {
    listen 80;
    server_name *.pagefire.yourdomain.com pagefire.yourdomain.com mcp.pagefire.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

```bash
nginx -t && nginx -s reload
```

## 7. 启动(PM2)

```bash
cd /opt/pagefire
pm2 start dist/index.js --name pagefire --max-memory-restart 200M
pm2 save
pm2 startup     # 跟随系统开机,按提示执行它打印的命令
```

`pnpm start`(= `node dist/index.js`)会在同一进程并行启动 MCP(4100)+ 静态面(4000)。

## 8. 验证

```bash
# 本机健康检查
curl -s http://127.0.0.1:4000/healthz   # → ok
curl -s http://127.0.0.1:4100/healthz   # → ok

# 公网:用 token 调一次 MCP（应返回工具列表）
curl -s https://mcp.pagefire.yourdomain.com/mcp \
  -H "Authorization: Bearer pf_xxx" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

浏览器打开 `https://pagefire.yourdomain.com` 看到控制台首页即成功。

## 9. 备份(强烈建议)

PageFire 的数据全在 `/var/pagefire`(`sites/` + `pagefire.db`)。务必配一个定时备份,避免误删 / 损坏后无法恢复:

- 用 SQLite 在线备份 API 取一致快照(WAL 下安全)
- 静态文件用 `rsync --link-dest` 增量(未变文件硬链接,不重复占空间)
- 保留最近 N 份,自动轮转

参考脚本与 cron 安装见仓库本地目录 `docs/deploy/backup.sh`(含完整实现与安装命令)。要点:

```bash
# 每天 03:37 跑一次,日志写到 /var/log/pagefire-backup.log
37 3 * * * /opt/pagefire/scripts/backup.sh >> /var/log/pagefire-backup.log 2>&1
```

## 升级

```bash
cd /opt/pagefire
git pull
pnpm install
pnpm build
pm2 restart pagefire
```

数据库会在启动时自动迁移;`/var/pagefire` 不受升级影响。

## 接入 MCP 客户端

部署完成后,把 token 填进 MCP 客户端,见 [docs/MCP_GUIDE.md](MCP_GUIDE.md)(支持 HTTP 直连 / stdio 桥接 / `pagefire-mcp` npm 包三种接法)。
