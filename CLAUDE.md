# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**PageFire** —— 自托管的静态发布服务。通过 MCP 协议把 HTML / Markdown / ZIP / 目录一键发布成带 HTTPS 的独立子域名页面。类 EdgeOne Pages，但自托管、多租户、即发即得。

线上实例：**pagefire.hkting.com** 与 **pagefire.openhkt.com** 两个域名同时在线、功能等价（`PAGEFIRE_BASE_DOMAIN` 是逗号分隔列表，两个都接受访问）。

**但两者分工不同，别当成"主域名 + 备用域名"**：`[0]` 是 `hkting`，所以**部署 URL 按 hkting 生成**；而**产品对外的身份仍在 `openhkt`** —— npm 包 `pagefire-mcp` 的默认端点（`packages/mcp-client/src/index.ts` 的 `DEFAULT_URL`）、两个 `package.json` 的 `homepage`、渲染页脚（`core/docs.ts`、`core/markdown.ts`）、i18n 示例内容、`examples/` 里的链接，全部指向它。改域名不是改文档就能收口的：动 `DEFAULT_URL` 等于改已发布 npm 包给所有用户的默认连接目标。

## ⚠️ 操作安全(最高优先级)

1. **破坏性命令必须先经用户同意**: `rm -rf`、通配删除、`DROP`/批量 `DELETE`、`mv`/覆盖数据、`git reset --hard`、`git push --force`、`pm2 delete`、改/删 nginx·证书·`.env` 等**不可逆或影响线上数据的操作，执行前必须明确征得用户同意**。
2. **绝不对数据目录用通配删除**: `/var/pagefire/sites`、`pagefire.db` 是线上用户数据。清理只删明确的单个 `token_id`/`did` 路径，**严禁** `rm -rf /var/pagefire/sites/*`。（曾因通配误删全部 47 个部署）
3. 线上服务器与其它服务**同机共存**：只动 PageFire 自己的进程/目录，**绝不碰同机其他服务的进程、容器、nginx 配置或证书**（对共享资源只做加法，不做改动）。
4. **公开仓库的信息边界**（本仓库是 public）：已提交的文件只写**架构与做法**，具体坐标一律用占位符 —— `<your-server-ip>`、`<co-tenant-domain>`、`<nginx-container>`。**主机 IP、SSH 私钥路径、同机其它服务的产品名/域名/容器名/目录**只写进 `docs/deploy/`（gitignore'd，是运维细节的唯一出处）。守卫测试 `test/unit/public-docs.test.ts` 会扫描所有已提交文件，违反即 CI 红。

## 常用命令

```bash
pnpm install
pnpm build        # tsc → dist/，并复制 src/db/schema.sql 与 src/assets/(remark.min.js，幻灯片运行时)
pnpm dev          # tsx watch src/index.ts
pnpm start        # node dist/index.js (MCP:4100 + HTTP:4000)
pnpm test         # vitest run (全部)
pnpm test:unit    # vitest run test/unit
pnpm lint:quotes  # 检查 HTML 模板中的弯引号

# 跑单个测试文件 / 单个用例
pnpm exec vitest run test/unit/serve-file.test.ts
pnpm exec vitest run -t "部分用例名"

pnpm exec tsc --noEmit   # CI 的类型检查(只覆盖 src/，不含 test/ 与 packages/)
```

Markdown 图表需先下载自托管 mermaid（缺失时路由会 302 到 CDN）：`node scripts/download-mermaid.mjs`

### 两个不同的 CLI —— 别混淆

| | 服务端管理 CLI | 用户 CLI / MCP 连接器 |
|---|---|---|
| 位置 | `src/cli/index.ts` → `dist/cli/index.js` | `packages/mcp-client` (npm 包 `pagefire-mcp`) |
| 命令 | `token create\|list\|disable\|rotate\|set-space-id`、`gc` | `deploy`、`deploy-docs`、`deploy-markdown`、`deploy-presentation`、`list`、`pin`、`delete` |
| 用途 | 运维：发 token、回收过期部署 | 发布者：发布与生命周期管理；同时是 stdio MCP bridge |

```bash
node dist/cli/index.js token create --slug <name> [--label <text>]
node dist/cli/index.js gc
cd packages/mcp-client && pnpm install && pnpm test   # 该包有独立依赖与测试
```

## 架构约束(改动前必读)

1. **纯静态，服务器侧绝不执行用户代码**（无 PHP/SSR）。用户 JS 只在访客浏览器跑。
2. **token 密钥 (`pf_xxx`) 永不进 URL、永不入库明文**。域名只用不透明随机 `space_id`；DB 只存 SHA-256 hash。
3. **单进程三角色**: 同一 Node 进程并起 MCP 写入面 (4100) + HTTP 静态面 (4000)；CLI 是另起的一次性进程。共享 better-sqlite3 (WAL)。
4. **MCP 用 Streamable HTTP transport**（服务器在远端，不能用 stdio）。
5. **上传写盘原子化**: 写 `sites/<token_id>/.tmp/` → 校验路径穿越/Zip Slip/zip bomb → rename。
6. HTML 模板一律内联在 `.ts` 里（无前端框架、无独立 HTML 文件），**属性值只能用 ASCII `"`**，弯引号会让 `test/unit/html-templates.test.ts` 失败。

## 架构要点

### 请求路由:Host 头 → did/space_id

`src/http/server.ts` 先把 `/api/` 前缀交给 `api.ts`，其余全部进 `router.ts`。`router.ts:handleRequest` 的判定顺序：

1. **与域名无关的保留路径**（先于任何域名判断）：`/__pf__/mermaid.min.js`、`/__pf__/remark.min.js`（自托管运行时，缺失则 302 到 CDN）、`/hXvfiH7OHs.txt`（微信 webview 校验）、`/healthz`。
2. `resolveBaseDomain(host, baseDomains)` 匹配基础域名：**精确等于 apex** → 根域路由（品牌图标、`/dashboard`、`/playground`、其余落到着陆页）；子域名 → 下一步；不匹配 → 404。
3. 从子域名切出 `did` / `space_id`：优先识别历史遗留的 `<did>--<space_id>`（双横线），否则 `<did>-<space_id>`（单横线），无横线则只当 `space_id`（必然 404）。

> `did` 的字符集是 `[a-z0-9]`（**不含连字符**），正是为了让单横线切分无歧义 —— 见 `core/validate.ts:validateCustomDid`。

**多基础域名**: `PAGEFIRE_BASE_DOMAIN` 支持逗号分隔列表，`config.baseDomains` 全部接受访问，`[0]` 为生成 URL 的主域名（`config.ts:parseBaseDomains`）。

**`_pf/` 命名空间**（部署子域名下，被 `isPageRequest` 排除在口令拦截之外）：`_pf/login`、`_pf/logout`、`_pf/counter`。

### 三套互不相干的鉴权

| 场景 | 凭据 | 存储 |
|---|---|---|
| MCP 写入面 | `Authorization: Bearer pf_...` → SHA-256 后查 `tokens` 表且 `status='active'` | DB 存 hash（`src/auth.ts`） |
| Web 控制台 | `pf_session` cookie（HttpOnly/Secure/SameSite=Lax/30d） | `sessions` 表（`src/http/api.ts`） |
| 口令保护的部署 | `pf_auth` cookie 或 `X-Passphrase` 头 | **无状态** HMAC 签名 token，密钥派生自 `PAGEFIRE_TOKEN_ENC_KEY`（`src/http/session.ts`） |

MCP 限流：`config.rateLimit`（`PAGEFIRE_RATE_LIMIT`，默认 20）对每个 token 生效，60s 滑动窗口，实现抽在 `src/mcp/rate-limit.ts`（内存 Map，因此是**每进程**而非全局配额）；`server.ts` 的 12 个工具调用点与 `/upload` 共用它，`test/unit/rate-limit.test.ts` 覆盖。注册接口另有 5 次/小时/IP 限流。

### 两条发布通道 —— 10 MB 内联上限的由来

- **内联工具**（`deploy_page`/`deploy_markdown`/`deploy_files`/`deploy_docs`/`deploy_zip`/`deploy_presentation`）：内容走 MCP 工具参数，受 `publish.ts:MAX_FILE_BYTES` 单文件 10 MB 限制，请求体上限 `MAX_MCP_BODY` 70 MB。
- **带外上传**：`POST /upload`（MCP 端口 4100，64 MB 上限），由 **`packages/mcp-client` 的连接器本地工具** `deploy_dir` / `deploy_docs_dir` / `deploy_file` 调用 —— 它们在客户端读本地磁盘再 POST，`deploy_docs_dir` 走 `render:'docs'`。**这三个不是服务端 MCP 工具**，服务端的 `deploy_files`/`deploy_docs` 只收内联内容。

MCP 传输是**无状态**的（`sessionIdGenerator: undefined`，逐请求新建 `McpServer`），且**没有 `/mcp` 专属路径** —— 除 `/healthz`、`/upload` 外的任何请求都按 MCP 处理。工具注册与 zod schema 都写在 `src/mcp/server.ts`，`src/mcp/tools/*.ts` 只是被调用的普通函数。

### 发布主流程

`src/mcp/tools/*` → `core/publish.ts:publish()` → `resolveTarget`(自定义 did 属己则原地更新、被他人占用则报错) → 校验 CSP → 逐文件 10 MB 校验 → `checkQuota` → `core/deploy.ts:deployFiles`(写 `.tmp/` → rename) → `finalizeDeployment`(写 DB + 审计日志)。

`deployFiles` 对已存在的正式目录是**先改名备份再 rename，失败自动回滚**（备份落到 `sites/<token_id>/<did>.old-<rand>`，成功后删除），所以重发全程旧版本都可访问；`rename` 的原子性保证失败时要么原样、要么恢复。`docs/design.md` §12 的"先备份再替换、失败可回滚"**已实现**，`test/unit/deploy.test.ts` 覆盖（含用 `vi.mock('fs')` 注入 rename 故障验证回滚）。更新时生命周期/访问控制的沿用逻辑见 `finalizeDeployment`。

### 静态服务管线(`src/http/serve.ts`)

`resolveServePath` 决定目标：直接命中文件 → 目录取其 `index.html`（**目录不会 SPA 回退**）→ 缺失且 `spa` 且是页面类扩展名 → 根 `index.html`。路径穿越拦截在 **router** 里做（`decodeURIComponent` → `pathHasDotDotSegment` → `resolve` 前缀包含判断），不在 serve.ts。

`serveFile` 顺序：stat → 弱 ETag `W/"size-mtime"` → HTML `no-cache`/其余 `max-age=300` → **304 短路早于一切正文处理** → SVG 清洗（失败则强制下载头）→ Range（仅 identity、不与压缩并用）→ gzip（可压缩类型、1KB–2MB、gzip 结果按 mtime LRU 缓存）→ 原始流。

HTML 另有 `serveHtmlWithCounter`：注入 favicon 家族 + OG/Twitter 卡片 meta（显式 → 从 `<img>`/`<title>`/`<h1>` 自动推断 → 平台 logo 兜底）+ 微信 JS-SDK + 浏览量 DOM 与上报脚本。**ETag 只基于文件 stat，不含浏览量**，所以计数变化不会破坏 304。

> `docs/design.md` §11 里写的 `<did>--<space_id>`（双横线）已是遗留格式，现行为单横线。

### 视图计数器(`src/http/counter.ts`)

内存 `pending`(did→增量) + `cached`(did→已落库总数)，**每 60s** 在单事务里批量 `UPDATE ... views = views + ?` 落盘；flush 失败保留 pending 待重试。读路径 = `cached + pending`，不查库。timer 已 `unref`。

### 安全头与 CSP 合并(`src/http/headers.ts`)

默认 CSP 较宽（`script-src` 含 `'unsafe-inline' 'unsafe-eval' https:`），因为要支持用户上传的任意静态站。部署级自定义 CSP 会被 `buildSecurityHeaders`/`enforceMinimumCsp` 合并，强制补回 `script-src 'unsafe-inline'`、`style-src 'unsafe-inline'`、`connect-src 'self'` —— 否则注入的计数器脚本会被自己的 CSP 拦掉。CSP 值在发布时校验（长度 + 控制字符，控制字符会让 `setHeader` 抛错变 500）。

## 测试

- `test/unit/` 25 个文件，vitest + Node 环境，**纯函数为主、多用临时目录，不强依赖完整服务**（`auth.test.ts` 用 `better-sqlite3` `:memory:`）。改动 serve/router/headers/markdown 后重点跑：`serve-file`、`serve-html-counter`、`resolve-serve-path`、`etag`、`counter-inject`、`csp`、`base-domain`、`html-templates`。
- `test/integration/` 仅两个 TODO 占位（断言恒真），要跑起来需完整服务。
- **守卫测试**（都在 `test/unit/`，用 `git ls-files` 扫已提交文件，专门防「同一个事实写在两处然后漂移」）：
  - `html-templates.test.ts` —— 遍历 `src/http/*.ts` 检查 HTML 属性里的弯引号，内联模板最常见的静默错误。
  - `public-docs.test.ts` —— 已提交文件里不得有主机 IP / 同机其它服务信息（见「公开仓库的信息边界」）。邻居名词表**不在这个文件里**，而在 `docs/deploy/sensitive-terms.txt`（已 gitignore）：词表本身也是秘密，写进守卫等于守卫自己泄露它；文件缺失时该条自动跳过（别人的 clone、CI）。另有一条**读者向文档自给自足**：`READER_FACING` 名单里的文档（README、DEPLOY、MCP_GUIDE、design、examples、mcp-client README 等）不得提 `docs/deploy` —— 公开 clone 拿不到那个目录，指过去就是走不通的指引。
  - `docs-links.test.ts` —— 文档相对链接必须存在**且已提交**（本地有、忘了 `git add` 也算红）。**没有豁免名单**：曾对 `docs/deploy/` 开过一条，结果正好把「本地能打开、clone 下来是死链」护在检查之外（DEPLOY.md 让读者去看私有 `backup.sh` 就这样绿了很久）。正确做法是让公开文档自给自足，不是豁免。
  - `docs-extension-list.test.ts` —— `docs/MCP_GUIDE.md` 的扩展名表必须逐个等于 `validate.ts:ALLOWED_EXTENSIONS`。
  - `env-example.test.ts` —— `.env.example` 必须覆盖 `config.ts` 读的全部变量（漏一个就是配置漂移，`PAGEFIRE_TOKEN_ENC_KEY` 漏掉尤其危险）。
  - `brand-assets.test.ts` —— `src/http/assets.ts` 里内嵌的品牌资源是源图的派生物，源图一变就必须有人重新生成（详见 `docs/product-design/README.md`）。
  - `agents-md-sync.test.ts` —— `AGENTS.md` 与 `CLAUDE.md` 除头部外逐字一致（见下）。
  - `readme-parity.test.ts` —— `README.md` 与 `README.en.md` 是同一份文档的两份拷贝，改中文容易忘英文。不比散文（那本来就该不同），只钉翻译**不该动**的东西：标题层级序列、链接目标顺序、环境变量名、MCP 工具名、CLI 子命令、代码块数量。
- `packages/mcp-client` 有独立测试，根目录 `pnpm test` 不覆盖它。
- 根 `tsconfig.json` 是 `NodeNext`：**新增源码的相对导入必须带 `.js` 后缀**。

## 线上部署

- 代码: `/opt/pagefire`；数据: `/var/pagefire/`（`sites/<token_id>/<did>/` + `pagefire.db`）
- PM2: `pm2 start dist/index.js --name pagefire --max-memory-restart 200M`
- nginx 反代（复用同机已有 nginx 容器，host network，只追加 server 块）: `*.pagefire` → `127.0.0.1:4000`，`mcp.pagefire` → `127.0.0.1:4100`
- 备份 `/opt/pagefire/scripts/backup.sh`（cron `37 3 * * *`）—— 源码就是仓库里的 `scripts/backup.sh`，改动后需手动 `cp` 到服务器该路径
- **服务器地址、SSH 凭据、证书/DNS/nginx 具体操作一律见 `docs/deploy/`（已 gitignore，含私钥）** —— 本文件随公开仓库提交，**不要写入主机 IP、密钥路径、内部服务名或端口占用情况**。
- 本地默认数据目录是 `./dev-data/`（`dev-data/` 已 gitignore），不是 `/var/pagefire`

## 文档

- `docs/README.md` — **文档总入口**（按「我想知道什么」查的导航表 + 每个事实的唯一出处表）。新增文档先看这里。
- `docs/design.md` — **权威设计文档**（架构决策以它为准，改架构前先改这里）。2026-09-28 已就地校正与代码的漂移：单横线 URL 格式、原子发布回滚、工具数 12、CLI 子命令、域名、扩展名清单；文件树仍是设计期草图，当前代码地图以本文「架构概要」为准。
- `docs/MCP_GUIDE.md` — 面向使用者的 MCP 手册（工具参数、场景、限制）。
- `docs/DEPLOY.md` — 公开版部署指南；`docs/deploy/`（gitignore'd，含私钥与真实主机坐标）— 内部部署手册。
- `packages/mcp-client/README.md` — `pagefire` CLI 与连接器文档。
- `specs/`、`.specify/`、`.claude/`、`.agents/`、`.codex/`、`docs/deploy/` 均已 gitignore；`AGENTS.md` 亦然（它由 CLAUDE.md 生成、按设计只留本地）。

写文档时的守卫见上文「测试」节 —— 那里是守卫的唯一清单，此处不再重复（抄两份必然漂移）。
