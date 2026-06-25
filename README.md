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

## 接入 MCP 客户端

在项目根目录（或用户目录）创建 `.mcp.json`（**不要提交到 Git**）：

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

配置完成后重启 MCP 客户端，即可直接对话发布页面：

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

完整部署步骤（nginx 共存、证书申请、PM2 配置）见：

- [docs/deploy/PAGEFIRE_DEPLOY.md](docs/deploy/PAGEFIRE_DEPLOY.md) — PageFire 专属部署手册
- [docs/design.md](docs/design.md) — 架构设计与安全模型

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
