# PageFire 设计文档

> 一个通过 MCP 一键把 HTML / 静态包发布成可访问网页、托管到自有服务器的静态发布服务。
> 类 EdgeOne Pages,但自托管、轻量、多租户、即发即得(像分享链接)。

- 日期:2026-06-23
- 项目名:**PageFire**
- 域名:`*.pagefire.openhkting.com`
- 状态:设计已确认,待实现

---

## 1. 目标与场景

让 Claude / Cursor 等 MCP 客户端,把生成的 HTML(单页,或带图片/CSS/JS,或一个 zip/文件夹)**一键发布**成公网可访问网页,托管在自有 Linux 服务器 + 已备案域名上,**即发即得一条分享链接**。

典型用法:
- **临时预览**:10 分钟内连发 10 个独立单页 HTML,各自拿到一条链接丢给别人看,过期自动清理。
- **多文件项目**:偶尔发一个文件夹 / zip(内含多个 HTML + css/img 等资源),整包挂到一个根链接,内部跳转/资源正常。

### 已确认决策

| 维度 | 决策 |
|------|------|
| 项目名 | **PageFire** |
| 主域名 | `pagefire.openhkting.com`,通配 `*.pagefire.openhkting.com` |
| 多租户 | token = 一个账号/空间;每个 token 映射一个**不透明 space_id**(三级域名身份);可发无限多次(受配额) |
| 发布单元 | **Deployment** —— 一次发布 = 一个独立随机 ID + 一条独立链接 |
| 单文件 | 落为该 deployment 的 `index.html`,链接根直达 |
| 多文件/zip | 整包解到 deployment 根目录,入口 `index.html`,绝对/相对路径都正常 |
| URL | `https://<did>--<space_id>.pagefire.openhkting.com/`,**全随机不透明,不含 token** |
| 防泄漏 | token 密钥永不进 URL;域名用 space_id 映射,可轮换;域名零语义、抗枚举 |
| 生命周期 | 临时发布默认过期(默认 7 天),可 `pin` 转永久,可 `delete` 立即删 |
| 访问控制 | 默认公开,支持可选访问口令 |
| Token 发放 | CLI 手动生成 |
| 托管 | 纯静态,服务器侧不执行任何用户代码 |
| Web Server | **复用现有 nginx**(与 Luminar 共用 80/443),PageFire 自带轻量 HTTP 静态服务,nginx 反代到它 |
| 部署位置 | 与 Luminar 同一台阿里云服务器(`8.163.52.153`,1.8GB),纯静态 + 单 Node 进程,内存占用低 |
| 通配 TLS | certbot/acme.sh **DNS-01**(阿里云 DNS 插件)签发 `*.pagefire.openhkting.com`,nginx 终止 TLS |

---

## 2. 整体架构

> ⚠️ **与原始设计的关键差异**:本服务**与 Luminar 部署在同一台服务器**,该机已有 nginx(docker, host network)独占 80/443。为避免端口冲突、节省内存,PageFire **放弃独立 Caddy**,改为:
> - nginx 作唯一入口,新增一个 `*.pagefire.openhkting.com` 的 server,反代到 PageFire 内网端口;
> - 「解析子域名 → 反查 token/部署 → 定位目录」这部分动态路由(Caddy 本就做不到纯静态)由 **PageFire 自带的 HTTP 静态服务**承担;
> - 通配 TLS 由 **certbot/acme.sh + 阿里云 DNS-01** 签发,nginx 终止。
> 详见 §4、§8 及 `docs/deploy/PAGEFIRE_DEPLOY.md`。

```
┌─────────────┐   MCP(stdio / SSE)     ┌────────────────────────────────────┐
│ Claude/IDE  │ ───────────────────────►│  PageFire 进程(Node/TS, PM2)       │
│ (MCP Client)│  deploy_page / deploy_  │  ┌─ MCP Server ──────────────────┐ │
└─────────────┘  zip / list / pin / del │  │ token 鉴权 / HTML·zip 校验清洗 │ │
                 token: pf_xxx           │  │ 路径穿越·Zip Slip / 写盘+元数据│ │
                                         │  └────────────┬──────────────────┘ │
                                         │  ┌─ HTTP 静态服务(127.0.0.1:4000)┐ │
                                         │  │ 读 Host 头 → 解析 did/space_id │ │
                                         │  │ 查 SQLite → serve 对应目录     │ │
                                         │  │ 注入安全头 / 口令校验 / 限流   │ │
                                         │  └────────────┬──────────────────┘ │
                                         └───────────────┼─────────────────────┘
                                          只写,不执行     │ 只读
                                                    ▼     ▼
                                         ┌──────────────────────┐
                                         │  存储层               │
                                         │  /var/pagefire/sites/ │ ← 纯静态
                                         │  + SQLite(元数据)    │
                                         └──────────────────────┘
                                                    ▲
                          ┌─────────────────────────┴─────────────────────────┐
                          │  nginx(docker, host network, 80/443)── 唯一入口    │
                          │  jewelry.openhkt.com/*        → Luminar(现有,不动)│
                          │  *.pagefire.openhkting.com/*  → 反代 127.0.0.1:4000 │
                          │  通配 TLS(certbot/acme.sh DNS-01)、可加限流        │
                          └────────────────────────────────────────────────────┘
```

**关键解耦**:MCP Server 只写静态文件;对外服务的是 nginx + PageFire 静态服务;服务器侧**绝不执行用户 HTML/JS**(无 PHP / SSR),用户 JS 只在访客浏览器跑。这是整个安全模型的基石。MCP 与 HTTP 静态服务都只绑 `127.0.0.1`(分别 4100 / 4000),公网仅经 nginx 触达;MCP 那一面强制 `Bearer` token 鉴权(详见 §7「MCP 传输方式」)。

技术栈:**TypeScript + 官方 `@modelcontextprotocol/sdk`** + `better-sqlite3` + 复用 nginx。

---

## 3. 核心概念:Deployment(发布单元)+ 防泄漏映射

不管这次发的是 1 个 HTML 还是 zip 里 20 个 HTML,系统都视为**一次部署**,分配唯一随机 ID,挂在独立的域名根下:

```
https://<did>--<space_id>.pagefire.openhkting.com/
       └ 随机6位,每次发布不同   └ 该 token 的不透明随机身份(非 token,可轮换)
```

**为什么不直接把 token 标识放域名(防泄漏)**:
- token 密钥 `pf_xxx` 仅用于鉴权,**绝不进 URL**。
- 域名里的 `space_id` 是与 token **多对一映射的随机不透明串**,本身不能反推 token、不能用于鉴权;即使被人看到也只是个无意义 ID。
- 一旦某 space_id 被滥用/泄漏关联,可**轮换**成新 space_id(旧链接失效),token 不变。
- `space_id` 与 `did` 都是高熵随机,域名**零语义、抗枚举**,看不出"谁发的、发了多少"。

- **单文件**:`k3p9xa--v8x2qd.pagefire.openhkting.com/` → 内容即 `index.html`。
- **多文件/zip**:整包解到该 deployment 根:
  ```
  t5h2kq--v8x2qd.pagefire.openhkting.com/
    ├ /            → index.html(入口)
    ├ /about.html
    ├ /css/x.css
    └ /img/a.png
  ```
- **为什么 deployment 挂域名根(而非路径)**:很多 HTML/zip 内部用**绝对路径** `/css/x.css`。挂在域名根时绝对路径天然正确,**丢个 zip 直接能跑**;若挂在路径 `/abc/t5h2kq/` 下,绝对路径会跑到域名根而 404。子域名方案零踩坑。
- **隔离**:每个 deployment 独立子域名 → 浏览器同源策略天然隔离,A 偷不到 B 的数据。

### token 主页(可选)
`https://<space_id>.pagefire.openhkting.com/` 作为该 token 的"三级域名空间"(同样用不透明 space_id,不暴露 token),可选地列出其下所有存活 deployment(简单 dashboard,建议要求登录/口令)。token 主页与各 deployment 都在 `*.pagefire.openhkting.com` 一层内,**一张通配证书全覆盖**。

---

## 4. 域名 / 证书方案

```
通配证书:  *.pagefire.openhkting.com   (DNS-01 签发,一张全覆盖,nginx 终止 TLS)
泛解析:    *.pagefire.openhkting.com → 服务器公网 IP 8.163.52.153(阿里云一条 A 记录)

token 主页:        v8x2qd.pagefire.openhkting.com           (space_id)
deployment:        k3p9xa--v8x2qd.pagefire.openhkting.com   (did--space_id)
                   t5h2kq--v8x2qd.pagefire.openhkting.com
```

**阿里云控制台需要配的两件事(详见 `docs/deploy/PAGEFIRE_DEPLOY.md` §1):**
1. **泛解析 A 记录**:在 `openhkting.com` 的解析里加一条 —— 主机记录 `*.pagefire`、记录类型 `A`、值 `8.163.52.153`。这样所有 `<任意>.pagefire.openhkting.com` 都指向服务器。
2. **DNS-01 自动签发的凭证**:为通配证书 `*.pagefire.openhkting.com` 准备一个阿里云 RAM 子账号的 AccessKey(仅授 DNS 解析读写权限),供 acme.sh/certbot 自动加 TXT 记录验证、自动续期。

- 通配证书只覆盖一层标签,所以 space_id 主页与 deployment **都压在这一层**(`xxx.pagefire.openhkting.com`),不用四级。
- `--` 作"did -- space_id"分隔符;两段各自仅 `[a-z0-9]`、定长(建议 did 6 位、space_id 6–8 位、高熵),避免冲突且抗枚举。
- **均为不透明随机串,不含 token**;space_id 可轮换。
- 后续若要"真四级" `<id>.abc.pagefire...`,需再签一张 `*.abc.pagefire.openhkting.com` 通配证书(DNS-01 同样可自动),接口不变。

---

## 5. 安全模型(防服务器入侵 —— 重点)

核心:用户内容与主机在每一层隔离,攻击者控制了页面内容也碰不到主机。

### ① 架构隔离(最重要)
- 纯静态,服务器侧**不执行任何用户代码** → 消灭绝大多数 RCE。
- 对外的 nginx + PageFire HTTP 静态服务对数据目录 **只读**;只有 MCP 写入路径有写权限,且**不监听公网**(stdio,或 SSE 绑 `127.0.0.1` + token)。HTTP 静态服务也只绑 `127.0.0.1:4000`,公网仅经 nginx 触达。

### ② 上传校验与清洗
- **路径穿越防护**:拒绝 `..`、绝对路径、符号链接;落盘前 canonical path 前缀校验,最终路径必须在该 deployment 目录内。
- **Zip 解压防护**(新增,因支持 zip):
  - **Zip Slip**:每个条目名解出绝对路径后必须仍在解压根内,否则拒绝。
  - **Zip bomb**:限制解压后总大小、文件数、单文件大小、压缩比上限;超限即中止并清理。
- **文件类型白名单**:仅 `.html .htm .css .js .png .jpg .jpeg .gif .svg .webp .ico .woff2 .json .txt .md .map`;拒绝 `.php .sh .py .exe .cgi` 等。
- **SVG 清洗**:去内嵌 `<script>` / 事件属性,或强制下载头。
- **配额**:单文件 / 单 deployment 总大小 / 单 deployment 文件数 / 单 token deployment 数,均设上限(防磁盘塞满型 DoS)。

### ③ 进程与系统加固
- MCP / Caddy 用**非 root 专用用户**运行。
- `systemd` 沙箱:`ProtectSystem=strict`、`NoNewPrivileges=yes`、`PrivateTmp=yes`、`ReadWritePaths=` 仅限数据目录。
- 可选 Docker 容器化,只挂数据卷。
- 防火墙仅开 80/443(已被 nginx 占用);MCP 写入端口与 HTTP 静态服务端口(4000)只绑 `127.0.0.1`,不对外。

### ④ 鉴权、限流与生命周期
- 每次 MCP 调用必须带有效 token(`pf_` 前缀;存哈希,不存明文);可禁用/吊销。
- 审计日志:每次 deploy/delete 记录 token、deployment、文件数、大小、IP、时间。
- nginx 层(或 PageFire 静态服务)对发布限流;页面访问基础限速防爬。
- **临时页过期**:未 `pin` 的 deployment 默认 7 天后由定时任务清理(文件 + 元数据),避免 dead link 堆积占盘。

### ⑤ 对外页面响应头
- 默认注入 `Content-Security-Policy`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`,视情况 `X-Frame-Options`。
- 可选访问口令:由 PageFire HTTP 静态服务在 serve 前校验(口令存元数据哈希),未通过返回 401。

---

## 6. 数据模型(SQLite)

```sql
-- 租户 / token
CREATE TABLE tokens (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,  -- 仅运维后台用的人类标签,不进域名,如 "zhangsan"
  space_id    TEXT UNIQUE NOT NULL,  -- 域名里的不透明随机身份,如 v8x2qd,可轮换
  token_hash  TEXT NOT NULL,         -- pf_xxx 的哈希,不存明文,绝不进 URL
  label       TEXT,                  -- 备注(发给谁)
  status      TEXT DEFAULT 'active', -- active / disabled
  quota_deployments INTEGER DEFAULT 100,
  quota_bytes       INTEGER DEFAULT 209715200,  -- 200MB
  created_at  INTEGER NOT NULL
);
-- 轮换 space_id:UPDATE tokens SET space_id=? WHERE id=?;旧域名随即失效。
-- 域名解析时由 Caddy/MCP 用 space_id 反查 token_id,token 密钥与 slug 均不出现在域名。

-- 部署单元
CREATE TABLE deployments (
  id          TEXT PRIMARY KEY,      -- 内部 id
  token_id    TEXT NOT NULL REFERENCES tokens(id),
  did         TEXT UNIQUE NOT NULL,  -- 域名里的随机6位,如 k3p9xa
  domain      TEXT UNIQUE NOT NULL,  -- k3p9xa--v8x2qd.pagefire.openhkting.com
  title       TEXT,                  -- 可选标题/备注
  access      TEXT DEFAULT 'public', -- public / password
  pass_hash   TEXT,                  -- 访问口令哈希(可选)
  pinned      INTEGER DEFAULT 0,     -- 1=永久不过期
  expires_at  INTEGER,               -- 临时页过期时间;pinned 时为空
  size_bytes  INTEGER DEFAULT 0,
  file_count  INTEGER DEFAULT 0,
  updated_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

-- 审计日志
CREATE TABLE deploy_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id    TEXT, deployment_id TEXT,
  action      TEXT,                  -- deploy / delete / pin / expire
  file_count  INTEGER, size_bytes INTEGER,
  ip          TEXT, created_at INTEGER
);
```

文件布局(用内部 token_id,不用 slug/space_id,避免轮换后改目录):
```
/var/pagefire/sites/<token_id>/<did>/index.html, css/, img/ ...
```

---

## 7. MCP 工具接口(均需 token 鉴权)

| 工具 | 说明 | 主要参数 |
|------|------|----------|
| `deploy_page` | 发布单页 HTML | `html`, `title?`, `did?`, `access?`, `password?`, `ttl_days?`, `pin?`, `spa?` |
| `deploy_zip` | 发布 zip 包(多文件) | `zip_base64`, `title?`, `did?`, 其余同上 |
| `deploy_files` | 发布多文件(显式文件列表) | `files:[{path, content/base64}]`, `did?`, 其余同上 |
| `deploy_markdown` | Markdown 渲染成精致网页 | `markdown`, `title?`, `theme?`(light/dark/sepia), `did?`, 其余同上 |
| `deploy_docs` | 多篇 Markdown → 带侧栏的文档站 | `files:[{path:.md, markdown}]`, `title?`, `theme?`, `did?`, 其余同上 |
| `list_deployments` | 列出当前 token 的发布 | `include_expired?` |
| `get_deployment` | 查详情 + URL | `did` |
| `pin_deployment` | 置为永久(不过期) | `did` |
| `delete_deployment` | 立即删除 | `did` |
| `set_access` | 改公开/口令 | `did`, `access`, `password?` |
| `set_space_id` | 自定义 token 的 space_id(子域名段) | `space_id` |

- **不传 `pin` 的发布默认临时**(`ttl_days` 默认 7);返回最终 URL。
- 返回值统一含 `url`,如 `https://k3p9xa-v8x2qd.pagefire.openhkting.com/`,以及 `did`、`updated`(是否原地更新)。
- **`did` 参数(链接不变)**:可选站点别名(`[a-z0-9]{3,32}`,无连字符)。复用自己拥有的 `did` → 原地覆盖、**URL 完全不变**;未占用 → 以该名建站(`<did>-<space_id>`);被他人占用 → `DID_TAKEN`;不传 → 随机。`deploy_page/zip/files/markdown/docs` 五个发布工具统一支持,更新时保留原 pin/ttl/access(除非显式覆盖),配额按净增量计。
- **统一发布管线**:所有发布工具最终走 `core/publish.ts`(`resolveTarget` + `finalizeDeployment`);`deploy_markdown`/`deploy_docs` 是纯转换(Markdown → 静态 HTML),发布时渲染,服务端不执行用户代码。
- token 经 MCP server 启动配置或请求头传入,服务端校验后定位租户。

### MCP 传输方式(★ 远程接入,修正原"stdio / 127.0.0.1"的不可行)

PageFire 跑在**远端服务器**,而 Claude/IDE 在**你本地**:
- ❌ **stdio** 只能拉起本机子进程,连不到远程;
- ❌ **绑 `127.0.0.1` 的 SSE** 本地客户端也访问不到。

✅ 正解:MCP 用 **Streamable HTTP transport**,经 nginx 暴露一个**固定子域名** `mcp.pagefire.openhkting.com`(由通配证书覆盖),PageFire 进程内 MCP 端只绑 `127.0.0.1:4100`,nginx 反代:
- 每个请求必须带 `Authorization: Bearer pf_xxx`,服务端校验 token 哈希后定位租户;无 token / 无效 → 401。
- 这是**唯一对公网开放的写入面**,因此鉴权 + 限流 + 审计必须齐全;它与对外静态服务(`*.pagefire`,只读)是不同 server 块、不同端口。
- 本地 `claude_desktop_config` / IDE 里配置该 MCP 的 URL + token 即可。
- 备选:若坚持 stdio,只能在服务器本地或通过 `ssh` 包一层命令,不适合日常远程使用。

CLI(在服务器本机运维,不经网络):
```
pagefire token create --slug zhangsan --label "给张三"
   # 生成 token(打印一次性明文 pf_xxx)+ 自动分配随机 space_id,打印对应域名
pagefire token rotate --slug zhangsan       # 轮换 space_id(泄漏时用,旧域名失效,token 不变)
pagefire token disable --slug zhangsan
pagefire token list                          # 显示 slug/space_id/状态/配额,不显示明文 token
pagefire gc                                  # 清理过期 deployment(平时由 cron/timer 自动跑)
```

---

## 8. 部署与运维

> 完整可执行步骤见 **`docs/deploy/PAGEFIRE_DEPLOY.md`**(与 Luminar 同机共存版)。要点:

- **Web 层**:复用现有 **nginx**(docker, host network)。新增一个 server 块:`server_name *.pagefire.openhkting.com`,443 终止通配 TLS,`proxy_pass http://127.0.0.1:4000`,透传 `Host` 头。Luminar 的 `jewelry.openhkt.com` server 块保持不动。
- **动态路由**:PageFire HTTP 静态服务收到请求后,读 `Host` 头解析子域名 `<did>--<space_id>`,用 SQLite `space_id→token_id`、`did→deployment` 反查真实目录(`/var/pagefire/sites/<token_id>/<did>/`)并 serve,注入安全头。空间/部署不存在或已过期 → 404。
- **TLS**:`acme.sh`(或 certbot)用 **阿里云 DNS-01** 自动签发 `*.pagefire.openhkting.com` 通配证书(需阿里云 RAM AccessKey),装到 nginx 证书目录,自动续期后 `docker restart` nginx。
- **DNS**:阿里云控制台为 `openhkting.com` 加一条 `*.pagefire A 8.163.52.153`。
- **服务**:PageFire 单进程由 **PM2** 托管(与 Luminar 的 backend/storefront 同一 PM2),`pm2 save` 持久化;数据目录权限收紧、非 root。
- **定时任务**:cron 周期执行 `pagefire gc` 清理过期发布。
- **备份**:定期备份 SQLite + `sites/`。
- **监控**:磁盘用量、证书有效期、内存余量(全机仅 ~400MB 余量,需盯)、审计日志告警。

---

## 9. 分阶段路线图

**MVP(核心链路)**
1. MCP Server:`deploy_page` + token 鉴权 + 路径/类型校验 + 写盘
2. SQLite 元数据 + CLI 生成 token
3. PageFire HTTP 静态服务:`<did>--<space_id>` 子域名解析 + space_id→token 反查 + serve + 安全头;nginx 反代 + 阿里云 DNS-01 通配证书
4. PM2 托管 + 非 root + 数据目录权限收紧 + 临时页过期 + `gc`

**第二阶段**
5. `deploy_zip` / `deploy_files` + Zip Slip / zip bomb 防护 + 配额 + SVG 清洗
6. `pin` / `delete` / `set_access` / 访问口令
7. `list_deployments` / `get_deployment` + 审计日志
8. token 主页 dashboard(列出存活发布)

**第三阶段(按需)**
9. 自助注册 / 管理后台
10. 真四级域名(再签一张 `*.abc.pagefire...` 通配证书)
11. CDN 接入、访问统计、自定义域名绑定

---

## 10. 已知权衡

- deployment 压在三级域名一层 → 牺牲"真四级层级感",换一张通配证书的极简运维。
- 与 Luminar 同机共用 nginx + 仅 ~400MB 内存余量 → 省成本但余量紧张;PageFire 纯静态+单轻量 Node 进程占用低,需配 PM2 内存上限并盯监控,必要时升级实例。

---

## 11. 项目代码结构

单进程承载三个角色(常驻 MCP HTTP 端 + 对外静态服务端 + 一次性 CLI),核心业务逻辑共用一份。建议 TS 单包(非必须 monorepo):

```
pagefire/
├── src/
│   ├── index.ts            # 进程入口:并行启动 MCP(127.0.0.1:4100)+ 静态服务(127.0.0.1:4000)
│   ├── config.ts           # 读 .env(DB 路径、sites 路径、端口、BASE_DOMAIN)
│   ├── auth.ts             # token 生成/哈希/校验(pf_ 前缀,存哈希)
│   │
│   ├── mcp/                # —— MCP 写入面(经 nginx + Bearer token 暴露)
│   │   ├── server.ts       # Streamable HTTP transport,注册工具,逐请求鉴权
│   │   └── tools/          # deploy_page / deploy_zip / deploy_files / list / get / pin / delete / set_access
│   │
│   ├── http/               # —— 对外只读静态面(*.pagefire,经 nginx)
│   │   ├── server.ts       # 监听 127.0.0.1:4000
│   │   ├── router.ts       # 解析 Host:<did>--<space_id> → 查 DB → 真实目录;404/过期页
│   │   ├── serve.ts        # 发静态文件 + Content-Type + 口令(401)校验
│   │   └── headers.ts      # CSP / nosniff / Referrer-Policy(HSTS 见 §12)
│   │
│   ├── core/               # —— MCP 与 HTTP 共用的业务逻辑
│   │   ├── deploy.ts       # 原子发布:写 tmp → 校验 → rename(见 §12)
│   │   ├── validate.ts     # 路径穿越 / 类型白名单 / SVG 清洗
│   │   ├── zip.ts          # 解压 + Zip Slip / zip bomb 防护
│   │   ├── quota.ts        # 单文件/单部署/单 token 配额
│   │   └── ids.ts          # did / space_id 高熵生成 + 碰撞重试(见 §12)
│   │
│   ├── db/
│   │   ├── schema.sql      # §6 的建表语句
│   │   ├── migrate.ts      # 初始化 / 迁移(WAL 模式,支持多进程读)
│   │   └── repo.ts         # tokens / deployments / deploy_logs 仓储
│   │
│   └── cli/index.ts        # pagefire token create|rotate|disable|list、gc
│
├── dist/                   # tsc 构建产物(部署上传 / pm2 start 的目标)
├── test/
├── .env.example
├── package.json
└── tsconfig.json
```

- **MCP 与静态服务同进程、共享 better-sqlite3 句柄**(开 WAL,CLI/gc 另起进程读写也安全)。
- 服务器侧只放 `dist/` + `node_modules` + `.env`;数据(`sites/`、`pagefire.db`)在 `/var/pagefire`,与代码分离,便于备份与权限隔离。

---

## 12. 设计补遗(评估新增)

- **原子发布**:写入先落 `sites/<token_id>/.tmp/<did>-<rand>/`,全部校验通过后 `rename` 到正式 `sites/<token_id>/<did>/`。避免访客看到写一半的部署;重发同 did 时旧目录先备份再替换,失败可回滚。
- **did / space_id 碰撞**:生成后查 DB 唯一性,冲突则重试(高熵下概率极低,但必须处理),N 次仍冲突报错。
- **健康检查**:静态服务暴露 `GET /healthz`(仅 `127.0.0.1`)→ `200 ok`,供 PM2 / 烟雾测试用;不经子域名解析。
- **错误页**:空间/部署不存在、已过期、被禁用 → 统一极简 404 页(不泄漏"存在但过期"等信息,抗枚举);口令未过 → 401。
- **HSTS 风险**:通配证书下若在 `*.pagefire` 注入 `Strict-Transport-Security: includeSubDomains`,会波及 `openhkting.com` 其它子域。**默认不加 includeSubDomains/preload**,仅对本层用普通 HSTS 或干脆不发,避免影响 Luminar 等同根域服务。
- **性能优化(可选,后置)**:静态服务解析出真实目录后,可用 nginx `X-Accel-Redirect` 把发文件交给 nginx,Node 只做鉴权/路由,省内存、抗大文件。MVP 直接 Node 发文件即可。
- **Content-Type**:按扩展名映射 MIME(白名单内),未知类型回退 `application/octet-stream`;`.svg` 经清洗后才以 `image/svg+xml` 发,否则强制下载头。
- **限流**:对外页面访问与 MCP 写入面都应限流(nginx `limit_req` 或进程内),防爬/防刷部署。
- 纯静态不支持服务端逻辑(无后端 API),这正是安全性的来源;如需动态能力应另起独立受限服务,不混入本服务。
- CLI 手动发 token 不适合大规模对外,留待第三阶段做自助注册。
