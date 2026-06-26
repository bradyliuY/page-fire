# pagefire-mcp

[![npm](https://img.shields.io/npm/v/pagefire-mcp)](https://www.npmjs.com/package/pagefire-mcp)

把 Claude / Cursor 等 MCP 客户端接入 **[PageFire](https://pagefire.openhkt.com)** 的 stdio 连接器，同时提供一套命令行工具，可在 CI / 脚本里发布静态站。

## 两种用法

| 用法 | 场景 |
|------|------|
| **MCP bridge**（默认） | 在 AI 对话中一句话发布 |
| **CLI**（v0.4+） | 脚本 / CI 中直接运行命令 |

---

## MCP Bridge（AI 对话）

在 Claude / Cursor 等客户端的配置里加：

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

Token 只通过**环境变量**传入，不进 `args`（不在进程列表泄露）。

配置好后直接对话即可：

```
把 ./dist 目录发布成网站，开启 SPA，永久保留。
把 docs/ 发布成多页文档站，主题用暗色。
帮我把这段 Markdown 渲染成网页。
```

### 为什么需要 stdio bridge？

PageFire 原生支持 HTTP 直连，大多数情况首选 HTTP 方式。但部分客户端（如使用 Bun 运行时的 Claude Desktop）的 TLS 指纹会被网络中间盒（DPI）重置，导致直连报 `Failed to connect`。本连接器运行在系统 Node（OpenSSL）上，通过 stdio 绕过指纹问题，工具和 Token 完全不变。

### 本地文件工具（MCP 对话中）

连接器额外提供三个**本地文件**工具，文件内容不经过模型，因此大文件 / 整目录发布是 O(1) tokens：

| 工具 | 作用 |
|------|------|
| `deploy_dir` | 把本地目录递归发布为静态站点（须含 `index.html`） |
| `deploy_docs_dir` | 读取目录下所有 `.md`，渲染成带导航的多页文档站 |
| `deploy_file` | 发布单个本地文件（HTML / Markdown） |

---

## CLI（脚本 / CI）

无需任何配置文件，`PAGEFIRE_TOKEN` 环境变量 + 命令即可：

```bash
export PAGEFIRE_TOKEN=pf_你的token

# 发布目录（须含 index.html）
npx pagefire-mcp deploy ./dist

# 发布目录，指定 did、永久保留、开 SPA
npx pagefire-mcp deploy ./dist --did=mysite --pin --spa

# 发布单个 Markdown 文件（自动渲染）
npx pagefire-mcp deploy README.md --theme=dark

# 发布 Markdown 目录为多页文档站
npx pagefire-mcp deploy-docs ./docs --title="API 文档" --pin

# 查看所有部署
npx pagefire-mcp list

# 将某个 did 设为永久保留
npx pagefire-mcp pin mysite

# 删除部署
npx pagefire-mcp delete mysite
```

### deploy

```
npx pagefire-mcp deploy <path> [options]
```

`<path>` 可以是：
- **目录**：递归上传，须含 `index.html`
- **`.md` 文件**：自动渲染成带样式的 HTML 网页
- **`.html` 文件或其他**：直接作为 `index.html` 发布

| 选项 | 说明 |
|------|------|
| `--did=<id>` | 自定义部署 ID（字母数字，不含连字符），相同 did 会覆盖 |
| `--title=<text>` | 页面标题 |
| `--theme=<light\|dark\|sepia>` | Markdown 主题（仅 .md 文件有效） |
| `--access=<public\|password>` | 访问控制，默认 public |
| `--password=<text>` | 当 access=password 时的口令 |
| `--ttl-days=<n>` | 有效天数（默认 7 天） |
| `--pin` | 永久保留 |
| `--spa` | 单页应用模式（404 → index.html） |
| `--exclude=<glob>` | 排除 glob（可重复）；也读取 `.pagefireignore` |

### deploy-docs

```
npx pagefire-mcp deploy-docs <dir> [options]
```

把目录内所有 `.md` 文件发布为带左导航 + 右侧 TOC 的多页文档站。

支持选项与 `deploy` 相同，`--spa` 无效，`--theme` 有效。

### list

```
npx pagefire-mcp list
```

以表格格式列出当前 Token 下的所有部署（did、URL、到期时间、pin 状态）。

### pin

```
npx pagefire-mcp pin <did>
```

将指定 did 的部署设为永久保留（取消 TTL 限制）。

### delete

```
npx pagefire-mcp delete <did>
```

删除指定 did 的部署及其全部文件。

### CI 示例

```yaml
# GitHub Actions
- name: Deploy to PageFire
  env:
    PAGEFIRE_TOKEN: ${{ secrets.PAGEFIRE_TOKEN }}
  run: |
    npx pagefire-mcp deploy ./dist --did=prod --pin
```

### .pagefireignore

在项目根放 `.pagefireignore`（格式同 `.gitignore`），`deploy` 和 `deploy-docs` 会自动读取：

```
# .pagefireignore
*.map
drafts/**
internal/
```

以下内容**默认**已排除，无需手动添加：

```
node_modules/  .git/  .env  .env.*  *.pem  *.key  .DS_Store
```

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|:---:|------|
| `PAGEFIRE_TOKEN` | ✅ | `pf_` 开头的 Bearer Token |
| `PAGEFIRE_URL` | — | 端点覆盖（自托管用），默认 `https://mcp.pagefire.openhkt.com/mcp` |
| `PAGEFIRE_DEBUG` | — | 设为 `1` 时打印诊断日志到 stderr |

## 前置要求

- Node.js ≥ 18

## License

MIT
