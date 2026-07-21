# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**PageFire** —— 自托管的静态发布服务。通过 MCP 协议把 HTML / Markdown / ZIP / 目录一键发布成带 HTTPS 的独立子域名页面。类 EdgeOne Pages，但自托管、多租户、即发即得。

线上实例：[pagefire.openhkt.com](https://pagefire.openhkt.com)

## ⚠️ 操作安全(最高优先级)

1. **破坏性命令必须先经用户同意**: `rm -rf`、通配删除、`DROP`/批量 `DELETE`、`mv`/覆盖数据、`git reset --hard`、`git push --force`、`pm2 delete`、改/删 nginx·证书·`.env` 等**不可逆或影响线上数据的操作，执行前必须明确征得用户同意**。
2. **绝不对数据目录用通配删除**: `/var/pagefire/sites`、`pagefire.db` 是线上用户数据。清理只删明确的单个 `token_id`/`did` 路径，**严禁** `rm -rf /var/pagefire/sites/*`。（曾因通配误删全部 47 个部署）
3. 线上服务器 (`8.163.52.153`) 上只动 PageFire 自己的进程/目录，**绝不碰 Luminar** (backend/storefront/nginx)。

## 架构约束

1. **纯静态，服务器侧绝不执行用户代码**（无 PHP/SSR）。用户 JS 只在访客浏览器跑。
2. **token 密钥 (`pf_xxx`) 永不进 URL**。域名只用不透明随机 `space_id`；DB 只存 SHA-256 hash。URL: `https://<did>-<space_id>.domain/`
3. **单进程三角色**: 同一 Node 进程并起 MCP 写入面 (4100) + HTTP 静态面 (4000)；CLI 是另起的一次性进程。共享 better-sqlite3 (WAL)。
4. **MCP 用 Streamable HTTP transport**（服务器在远端，不能用 stdio）。
5. **上传写盘原子化**: 写 tmp → 校验路径穿越/Zip Slip/zip bomb → rename。

## 架构概要

```
src/
├── index.ts                  # 进程入口: 并起 MCP + HTTP，捕获未处理异常
├── config.ts                 # 从 .env / 环境变量读取配置
│
├── cli/index.ts              # CLI 入口: token 管理 (create/list/disable/rotate/set-space-id), gc
├── auth.ts                   # Token 生成 (pf_ + 48 hex)、SHA-256 hash、Bearer 验证
│
├── core/                     # 业务核心
│   ├── deploy.ts             # 文件写入磁盘 (tmp → rename)，FileEntry 接口
│   ├── publish.ts            # 发布主流程: resolveTarget → checkQuota → deployFiles → DB 记录
│   ├── validate.ts           # 路径穿越校验、扩展名白名单、文件大小限制、自定义 did/space_id 校验
│   ├── ids.ts                # 生成 did (6位随机)、space_id (8位随机)，保证唯一
│   ├── zip.ts                # ZIP 解压 (yauzl)，含路径穿越防护
│   ├── markdown.ts           # Markdown → HTML (marked)，含 Callout/Mermaid/代码高亮扩展
│   ├── docs.ts               # 多页文档站渲染: 左导航 + 右 TOC + 自动重写 .md 链接
│   ├── slides.ts             # remark.js 幻灯片生成
│   ├── svg.ts                # SVG 清洗 (DOMPurify)
│   ├── quota.ts              # 配额检查 (部署数/字节数)
│   ├── token-enc.ts          # AES-256-GCM token 加密/解密
│   └── presentation/         # PDF/PPTX 解析与转换
│       ├── pdf.ts
│       └── pptx.ts
│
├── db/
│   ├── schema.sql            # SQLite 建表 (tokens/users/sessions/deployments/deploy_logs/invites)
│   ├── migrate.ts            # 打开 DB + 执行 schema + WAL
│   └── repo.ts               # 所有数据访问层函数 (约 40 个导出函数)
│
├── http/                     # HTTP 静态服务(端口 4000)
│   ├── server.ts             # HTTP 服务器创建与启动
│   ├── router.ts             # 请求路由核心: 解析 Host 头 → 查 token/deployment → serve 文件
│   │                         #   根域名: 首页/仪表盘/API playground
│   │                         #   子域名: 静态文件 + 视图计数器 + SPA fallback
│   ├── serve.ts              # 文件服务: MIME 类型、HTML 注入计数器、SVG 清洗
│   ├── headers.ts            # 安全头配置 (CSP, HSTS, X-Frame-Options 等)
│   ├── counter.ts            # 内存视图计数器 (每 30s 落盘到 SQLite)
│   ├── api.ts                # REST API: 用户注册/登录/登出/改密码、Token 管理、部署 CRUD
│   ├── home.ts               # 着陆页 HTML (内联 CSS/html 模板，no JS framework)
│   ├── dashboard.ts          # 仪表盘 HTML
│   ├── playground.ts         # API Playground HTML
│   ├── assets.ts             # 内嵌 logo/favicon base64
│   └── i18n/                 # 国际化
│       ├── zh.ts             #   中文文案
│       └── en.ts             #   英文文案
│
└── mcp/                      # MCP Server (端口 4100)
    ├── server.ts             # McpServer 初始化、Bearer 鉴权、速率限制、工具注册
    └── tools/
        ├── deploy-page.ts        # 发布单页 HTML
        ├── deploy-markdown.ts    # Markdown → HTML 发布
        ├── deploy-docs.ts        # 多页文档站 (files 参数)
        ├── deploy-files.ts       # 多文件发布
        ├── deploy-zip.ts         # ZIP base64 发布
        ├── deploy-presentation.ts # PDF/PPTX 发布
        ├── list-deployments.ts   # 列出部署
        ├── get-deployment.ts     # 查看单部署
        ├── pin-deployment.ts     # 设为永久
        ├── delete-deployment.ts  # 删除部署
        ├── set-access.ts         # 切换公开/口令
        └── set-space-id.ts       # 更换 space_id

packages/
└── mcp-client/              # pagefire-mcp npm 包 - 本地 Node 代理(解决 Bun TLS DPI 问题)
```

## 数据模型

7 张表 (schema.sql):
- `tokens` — API key 与 space_id 映射，关联 `user_id`（可为 null）
- `users` — 登录账号，关联 `token_id`（与 tokens 双向 FK，创建时先插 token → 再插 user → 回填 token.user_id）
- `sessions` — HTTP-only cookie 会话
- `deployments` — 每行一个独立 URL，含访问控制/pin/过期/SPA 模式
- `deploy_logs` — 审计日志
- `invites` — 注册邀请码

文件存储: `/var/pagefire/sites/<token_id>/<did>/`（纯静态，直接 serve）

## 关键模式

- **HTML 模板在 .ts 中**: 着陆页/仪表盘/Playground 都是 `home.ts`/`dashboard.ts`/`playground.ts` 中用内联模板（反引号字符串）渲染，无独立 HTML 文件或前端框架。所有 HTML 属性必须用 ASCII `"`，不能用弯引号 `"`（有专测 `test/unit/html-templates.test.ts` 检查）。
- **视图计数器**: `ViewCounter` 类维护内存计数，每 30s 批量写回 SQLite。HTML 注入 `_pf/counter` endpoint + 客户端 fetch POST 异步更新。
- **DB 访问**: 全部通过 `db/repo.ts` 的纯函数，每个函数一条 `db.prepare()`。事务在调用方控制（通常用 `db.transaction()`）。
- **Auth 双层**: MCP 用 Bearer token（SHA-256 hash 后查 DB）+ 速率限制；Web 用 session cookie（`sessions` 表）。
- **发布流程**: MCP 工具 → `publish.ts` → `deploy.ts`(写磁盘，原子 rename) → 写 DB。每步都有配额/校验检查。

## 构建与运行

```bash
pnpm install              # 安装依赖
pnpm build                # tsc → dist/ + 复制 schema.sql + assets
pnpm start                # node dist/index.js (MCP:4100 + HTTP:4000)
pnpm dev                  # tsx watch src/index.ts
pnpm test                 # vitest run (全部)
pnpm test:unit            # vitest run test/unit
pnpm test:integration     # vitest run test/integration (目前仅为占位)
pnpm lint:quotes          # 检查 HTML 模板中的弯引号 (vitest run test/unit/html-templates.test.ts)
```

CLI (需先 pnpm build):
```bash
node dist/cli/index.js token create --slug <name> [--label <text>]
node dist/cli/index.js token list
node dist/cli/index.js token disable --slug <name>
node dist/cli/index.js token rotate --slug <name>
node dist/cli/index.js token set-space-id --slug <name> --space-id <id>
node dist/cli/index.js gc
```

## 测试体系

- **单测**: `test/unit/`，vitest + Node 环境。`auth.test.ts` 使用 `better-sqlite3` `:memory:` 建临时表；`counter-inject.test.ts` 测 HTML 注入逻辑（纯函数、无 DB）。
- **继承测试**: `test/integration/`，目前仅为 TODO stubs，需要完整服务才能跑。
- **HTML 模板守卫**: `html-templates.test.ts` 遍历 `src/http/*.ts` 检查 HTML 属性中是否有弯引号——这是模板字面量 HTML 最常见的静默错误。
- 写新的 .ts 源码时，如果包含 HTML 模板片段，确保属性值只用 ASCII `"`。

## 线上部署

- 代码: `/opt/pagefire` (git clone + pnpm install + pnpm build)
- 数据: `/var/pagefire/` (sites/ + pagefire.db)
- PM2: `pm2 start dist/index.js --name pagefire --max-memory-restart 200M`
- nginx 反代（Docker 容器 `luminar-nginx`，host network）: `*.pagefire` → `127.0.0.1:4000`, `mcp.pagefire` → `127.0.0.1:4100`
- SSH: `ssh -i docs/deploy/hkt.pem root@8.163.52.153`
- 备份: `/opt/pagefire/scripts/backup.sh`，cron `37 3 * * *`，SQLite 在线备份 + rsync --link-dest 增量

## 文档

- `docs/design.md` — **权威设计文档**，架构决策已确认，改架构前先改这里
- `docs/deploy/`（gitignore'd，含敏感信息） — 部署手册、私钥、备份脚本
- `docs/DEPLOY.md` — 公开版部署指南
