# pagefire-mcp

[![npm](https://img.shields.io/npm/v/pagefire-mcp)](https://www.npmjs.com/package/pagefire-mcp)
[![Node](https://img.shields.io/node/v/pagefire-mcp)](https://nodejs.org)

把 Claude / Cursor 等 MCP 客户端接入 **[PageFire](https://pagefire.openhkt.com)** 的 stdio 连接器，同时提供 **`pagefire` CLI**，可在终端和 CI 中直接发布静态站。

---

## 安装

**全局安装（推荐，一次安装永久可用）**

```bash
npm install -g pagefire-mcp
```

安装后即可直接使用 `pagefire` 命令：

```bash
pagefire deploy ./dist
pagefire list
```

**免安装（npx，适合 CI 或偶尔使用）**

```bash
npx pagefire-mcp deploy ./dist
```

---

## CLI 快速开始

```bash
# 1. 设置 Token（或写入 .env）
export PAGEFIRE_TOKEN=pf_你的token

# 2. 发布目录（须含 index.html）
pagefire deploy ./dist

# 3. 得到链接
# → https://abc123--your_space.pagefire.openhkt.com/
```

---

## CLI 命令

### deploy

```bash
pagefire deploy <path> [options]
# 等价于
npx pagefire-mcp deploy <path> [options]
```

`<path>` 可以是：
- **目录**：递归上传，须含 `index.html`
- **`.md` 文件**：自动渲染成带样式的 HTML 网页
- **其他文件**：直接作为 `index.html` 发布

| 选项 | 说明 |
|------|------|
| `--did=<id>` | 自定义部署 ID（字母数字），相同 did 覆盖更新 |
| `--title=<text>` | 页面标题 |
| `--theme=<light\|dark\|sepia>` | Markdown 主题（默认 light） |
| `--access=<public\|password>` | 访问控制（默认 public） |
| `--password=<text>` | access=password 时的口令 |
| `--ttl-days=<n>` | 有效天数（默认 7 天） |
| `--pin` | 永久保留，不过期 |
| `--spa` | SPA 模式（404 → index.html） |
| `--exclude=<glob>` | 排除 glob（可重复）；也读 `.pagefireignore` |

```bash
# 示例
pagefire deploy ./dist --did=myapp --pin --spa
pagefire deploy README.md --theme=dark --pin
pagefire deploy ./dist --exclude=*.map --exclude=drafts/**
```

### deploy-docs

```bash
pagefire deploy-docs <dir> [options]
# 等价于
npx pagefire-mcp deploy-docs <dir> [options]
```

把目录内所有 `.md` 文件发布为带**左导航 + 右侧 TOC** 的多页文档站。

```bash
pagefire deploy-docs ./docs --title="API 文档" --theme=light --pin
```

### list

```bash
pagefire list
```

列出当前 Token 下的所有部署（did、链接、到期时间、pin 状态）。

### pin

```bash
pagefire pin <did>
```

将指定部署设为永久保留。

### delete

```bash
pagefire delete <did>
```

删除部署及其全部文件。

---

## .pagefireignore

在项目根放 `.pagefireignore`（格式同 `.gitignore`），`deploy` 和 `deploy-docs` 会自动读取：

```gitignore
# .pagefireignore
*.map
drafts/**
internal/
```

以下内容**默认已排除**，无需手动添加：

```
node_modules/  .git/  .env  .env.*  *.pem  *.key  .DS_Store
```

---

## CI / GitHub Actions

```yaml
- name: Deploy to PageFire
  env:
    PAGEFIRE_TOKEN: ${{ secrets.PAGEFIRE_TOKEN }}
  run: npx pagefire-mcp deploy ./dist --did=prod --pin
```

或先全局安装再使用（适合复用 `pagefire` 命令多次的工作流）：

```yaml
- name: Install PageFire CLI
  run: npm install -g pagefire-mcp

- name: Deploy
  env:
    PAGEFIRE_TOKEN: ${{ secrets.PAGEFIRE_TOKEN }}
  run: |
    pagefire deploy ./dist --did=prod --pin
    pagefire list
```

---

## MCP Bridge（AI 对话）

在 Claude / Cursor 配置里加：

```json
{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "pagefire-mcp@latest"],
      "env": { "PAGEFIRE_TOKEN": "pf_你的token" }
    }
  }
}
```

配置好后直接对话发布：

```
把 ./dist 目录发布成网站，开启 SPA，永久保留。
把 docs/ 发布成多页文档站，主题用暗色。
帮我把这段 Markdown 渲染成网页。
```

### 本地文件工具（MCP 对话中）

连接器在转发服务端工具之外，额外提供三个**本地文件**工具（文件内容不过模型，O(1) tokens）：

| 工具 | 作用 |
|------|------|
| `deploy_dir` | 发布本地目录（须含 `index.html`，支持 `.pagefireignore`） |
| `deploy_docs_dir` | 发布本地 `.md` 目录为多页文档站 |
| `deploy_file` | 发布单个本地文件 |

### 为什么需要 stdio bridge？

PageFire 原生支持 HTTP 直连。但部分客户端（如使用 Bun 运行时的 Claude Desktop）的 TLS 指纹会被网络中间盒（DPI）重置，导致直连报 `Failed to connect`。本连接器运行在系统 Node（OpenSSL）上，通过 stdio 绕过指纹问题，工具和 Token 完全不变。

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|:---:|------|
| `PAGEFIRE_TOKEN` | ✅ | `pf_` 开头的 Bearer Token |
| `PAGEFIRE_URL` | — | 端点覆盖（自托管），默认 `https://mcp.pagefire.openhkt.com/mcp` |
| `PAGEFIRE_DEBUG` | — | 设为 `1` 时打印诊断日志到 stderr |

## 前置要求

- Node.js ≥ 18

## License

MIT
