# PageFire

[![CI](https://github.com/bradyliuY/page-fire/actions/workflows/ci.yml/badge.svg)](https://github.com/bradyliuY/page-fire/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 通过 MCP 一键把 HTML / 静态包发布成公网可访问网页的自托管静态发布服务。

类 EdgeOne Pages，但**自托管、轻量、多租户、即发即得**。让 Claude / Cursor 等 MCP 客户端直接把生成的 HTML 发布成带 HTTPS 链接的独立子域名页面。

---

## 功能特性

- **MCP 原生**：8 个 MCP 工具，AI 对话中一句话发布
- **即发即得**：秒级完成，自动返回可分享的 HTTPS 链接
- **多种发布方式**：单 HTML、多文件、ZIP 包均支持
- **SPA / MPA 双模式**：React/Vue 应用（SPA）与文档站（MPA）都能部署
- **访问控制**：公开或口令保护，支持动态切换
- **生命周期管理**：默认 7 天过期，可 pin 为永久，可随时删除
- **纯静态托管**：服务端永不执行用户代码，安全隔离
- **自托管**：运行在你自己的 Linux 服务器，数据完全自控

---

## 快速开始

### 前置要求

- Node.js ≥ 20
- pnpm
- 已备案域名 + 通配 DNS 解析（`*.pagefire.yourdomain.com A <your-ip>`）
- Linux 服务器（本项目与 nginx 共存，nginx 负责 TLS 终止）

### 安装

```bash
git clone https://github.com/bradyliuY/page-fire.git
cd page-fire
pnpm install
pnpm build
```

### 配置

复制示例配置并按需修改：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PAGEFIRE_DB` | SQLite 数据库路径 | `./dev-data/pagefire.db` |
| `PAGEFIRE_SITES` | 静态文件存储目录 | `./dev-data/sites` |
| `PAGEFIRE_HTTP_HOST` | HTTP 服务绑定地址 | `127.0.0.1` |
| `PAGEFIRE_HTTP_PORT` | HTTP 静态服务端口 | `4000` |
| `PAGEFIRE_MCP_PORT` | MCP 服务端口 | `4100` |
| `PAGEFIRE_BASE_DOMAIN` | 基础域名 | `localhost` |
| `PAGEFIRE_RATE_LIMIT` | 每分钟请求限制 | `30` |

### 启动

```bash
pnpm start        # 生产模式
pnpm dev          # 开发模式（tsx watch）
```

### 创建 Token

```bash
node dist/cli/index.js token create --slug mytoken --label "我的空间"
node dist/cli/index.js token list
```

---

## 使用方式

PageFire 有两种用法，共用同一套 API Key，可任意搭配：

- **Web 控制台** —— 浏览器零配置，注册即用，适合手动发布与管理。
- **MCP 客户端** —— 在 Claude / Cursor 等对话中一句话发布，适合 AI 工作流。

---

## Web 控制台（浏览器）

部署完成后，直接访问根域名 `https://pagefire.yourdomain.com` 即可看到内置的 Web 控制台，全程无需命令行：

| 页面 | 路径 | 作用 |
|------|------|------|
| **首页** | `/` | 产品介绍 + 注册 / 登录入口 |
| **控制台** | `/dashboard` | 管理 API Key：新建（每账号最多 10 个）、吊销、一键测试连接，查看 space_id 与部署数 |
| **Playground** | `/playground` | 浏览器内直接调用 MCP 工具发布页面，支持拖拽上传文件，即调即看 |

**自助开通流程（约 5 分钟）：**

1. 打开首页 → **注册账户**（用户名 3–20 位 + 密码 ≥ 6 位；若实例开启了邀请制，还需邀请码）。
2. 注册后自动进入**控制台**并生成第一个 API Key（`pf_` 开头）与独立 `space_id`。
3. 在 **Playground** 里直接发布试用，或把 API Key 复制到 MCP 客户端（见下文）。

> 账号用 `用户名 + 密码`（bcrypt 加密）登录，会话为 30 天 HttpOnly Cookie。API Key 在控制台以掩码形式展示，可随时吊销重建。

---

## 接入 MCP 客户端

把控制台拿到的 API Key 填入 MCP 客户端。在项目根目录（或用户目录）创建 `.mcp.json`（**不要提交到 Git**）。支持两种接法：

### 方式一：HTTP 直连（推荐，零依赖）

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.pagefire.yourdomain.com/mcp",
      "headers": {
        "Authorization": "Bearer pf_your_token_here"
      }
    }
  }
}
```

### 方式二：stdio 桥接（连不上时的兜底）

如果方式一报 **Failed to connect** —— 但浏览器能打开该域名、`curl`/Node 也能访问 —— 多半是**客户端运行时的 TLS 被网络中间盒按指纹拦截**（典型场景：某些客户端内置 Bun/特殊 TLS 栈，或处于带 DPI 的企业/校园网）。改用本机 Node 的 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) 桥接同一个端点即可绕过（需本机已装 Node ≥ 18 / npx）：

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp.pagefire.yourdomain.com/mcp",
        "--header", "Authorization:${AUTH_HEADER}",
        "--transport", "http-only"
      ],
      "env": { "AUTH_HEADER": "Bearer pf_your_token_here" }
    }
  }
}
```

> ⚠️ token 必须通过 `env.AUTH_HEADER` 传入、`--header` 写成 `Authorization:${AUTH_HEADER}`（中间**无空格**）。若直接写 `--header "Authorization: Bearer pf_xxx"`，头里的空格会在进程拼接时被拆断，导致**握手成功但工具调用报 `UNAUTHORIZED`**。

### 方式三：npm 连接器包（最简，推荐）

已发布到 npm：[`pagefire-mcp`](https://www.npmjs.com/package/pagefire-mcp)。配置最干净——token 只走环境变量，无 URL、无 header 拆断坑：

```json
{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "pagefire-mcp@latest"],
      "env": { "PAGEFIRE_TOKEN": "pf_your_token_here" }
    }
  }
}
```

底层与方式二一样经本机 Node 桥接、绕过指纹拦截，但免去了 `mcp-remote` 的 OAuth 探测与 header 拼接坑（详见 `packages/mcp-client/`）。

> 若 `npx` 默认源是国内镜像（如 npmmirror），新版本可能有同步延迟；可加 `--registry=https://registry.npmjs.org/` 或稍候片刻。

三种方式指向同一服务、token 通用，任选其一即可。配置完成后重启 MCP 客户端，即可直接对话发布页面：

```
帮我把这段产品介绍发布成网页，永久保留。
把下面这个 React 应用打包成 ZIP 发布，开启 SPA 模式。
```

---

## MCP 工具列表

| 工具 | 说明 |
|------|------|
| `deploy_page` | 发布单个 HTML 字符串 |
| `deploy_files` | 发布多文件站点（index.html + 资源） |
| `deploy_zip` | 发布 ZIP 包（base64 编码） |
| `deploy_markdown` | 发布 Markdown 文档（自动渲染） |
| `list_deployments` | 列出所有部署 |
| `get_deployment` | 查看部署详情 |
| `pin_deployment` | 设为永久保留 |
| `delete_deployment` | 删除部署 |
| `set_access` | 切换公开/密码保护 |
| `set_space_id` | 自定义域名标识 |

详细参数与示例见 [docs/MCP_GUIDE.md](docs/MCP_GUIDE.md)。

---

## 部署到生产服务器

完整部署步骤（nginx 共存、证书申请、PM2 配置）见 [docs/design.md](docs/design.md) 的部署章节。

> 含服务器 IP / 凭证的完整可执行手册仅在本地保留（`docs/deploy/`，不入库）。

---

## 开发

```bash
pnpm test             # 运行全部测试（35 个）
pnpm test:unit        # 仅单元测试
pnpm test:integration # 仅集成测试
pnpm build            # TypeScript 编译
```

### 项目结构

```
src/
├── index.ts          # 进程入口，同时启动 MCP + HTTP
├── auth.ts           # Token 鉴权
├── config.ts         # 环境变量读取
├── cli/              # CLI 命令（token 管理、gc）
├── core/             # 业务核心（发布、校验、zip 处理）
├── db/               # SQLite 数据层（schema、repo、migrate）
├── http/             # HTTP 静态服务与 dashboard
└── mcp/              # MCP Server 与工具定义
```

---

## 安全说明

- **服务端永不执行用户代码**：上传的 HTML/JS 只在访客浏览器运行
- **Token 密钥永不进 URL**：域名使用不透明随机 `space_id` 映射
- **上传原子化**：写 tmp → 校验 → rename，防路径穿越 / Zip Slip
- **MCP 接入面绑定内网**：仅 nginx 代理后对外，强制 Bearer 鉴权

---

## License

MIT © [OpenHKT](https://github.com/bradyliuY)
