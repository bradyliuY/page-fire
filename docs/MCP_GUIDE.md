# PageFire MCP 使用手册

PageFire 通过 [MCP（Model Context Protocol）](https://modelcontextprotocol.io) 让 AI 直接把 HTML / 文件 / ZIP 包发布成公网可访问的 HTTPS 页面。

> **两种用法，共用同一把 Key**：
> - **Web 控制台**（浏览器，零配置）—— 见下方 [Web 控制台](#web-控制台)。
> - **MCP 客户端**（Claude / Cursor 对话式）—— 见下方 [快速接入](#快速接入)。

---

## Web 控制台

直接访问根域名 `https://pagefire.openhkt.com`，内置一套完整 Web 界面：

| 页面 | 路径 | 作用 |
|------|------|------|
| 首页 | `/` | 产品介绍 + 注册 / 登录 |
| 控制台 | `/dashboard` | 管理 API Key：新建 / 吊销 / 测试连接，查看 `space_id` 与部署数 |
| Playground | `/playground` | 浏览器内直接调用 MCP 工具发布，支持拖拽上传文件 |

**5 分钟自助开通**：首页**注册账户**（用户名 3–20 位 + 密码 ≥ 6 位，实例若开启邀请制则需邀请码）→ 自动进入控制台并生成首个 `pf_` API Key 与 `space_id` → 在 Playground 试发布，或把 Key 复制到 MCP 客户端。

---

## 快速接入

### 1. 获取 Bearer Token

- **推荐**：访问 `https://pagefire.openhkt.com` 注册账户，在**控制台**自助创建（`pf_` 开头）。
- 或：自托管管理员用 CLI 签发（`node dist/cli/index.js token create --slug <name>`）。

```
pf_your_token_here
```

### 2. 配置 MCP 客户端

在项目根目录创建 `.mcp.json`（**不要提交到 Git**）。支持两种接法，任选其一：

**方式一：HTTP 直连（推荐，零依赖）**

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.pagefire.openhkt.com/mcp",
      "headers": {
        "Authorization": "Bearer <你的token>"
      }
    }
  }
}
```

**方式二：stdio 桥接（连不上时的兜底）**

若方式一报 **Failed to connect**，但浏览器 / Node / curl 都能访问该域名，多半是客户端运行时的 TLS 被网络中间盒按指纹拦截（详见下方常见问题）。改用本机 Node 的 [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) 桥接同一个端点即可绕过（需本机已装 Node ≥ 18 / npx）：

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp.pagefire.openhkt.com/mcp",
        "--header", "Authorization:${AUTH_HEADER}",
        "--transport", "http-only"
      ],
      "env": { "AUTH_HEADER": "Bearer <你的token>" }
    }
  }
}
```

> ⚠️ token 必须通过 `env.AUTH_HEADER` 传入、`--header` 写成 `Authorization:${AUTH_HEADER}`（中间**无空格**）。若直接写 `--header "Authorization: Bearer <你的token>"`，头里的空格会在进程拼接时被拆断，导致**握手成功但工具调用报 `UNAUTHORIZED`**。

**方式三：npm 连接器包（最简，需先发布到 npm）**

发布 `pagefire-mcp`（仓库 `packages/mcp-client/`）后，配置最简洁，token 仅走环境变量：

```json
{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "pagefire-mcp"],
      "env": { "PAGEFIRE_TOKEN": "<你的token>" }
    }
  }
}
```

底层同样经本机 Node 桥接绕过指纹拦截，但免去 `mcp-remote` 的 OAuth 探测与 header 拼接坑。

配置完成后重新加载 MCP 插件，即可在 Claude / Cursor 等客户端中直接对话发布页面。

---

## 多页面与路由

### MPA（传统多页面）

使用 `deploy_files` 或 `deploy_zip` 部署多个 HTML 文件，每个文件对应一个独立 URL：

```
部署结构：
  index.html
  about.html
  docs/guide.html

访问路径：
  https://<did>-<space_id>.pagefire.openhkt.com/           → index.html
  https://<did>-<space_id>.pagefire.openhkt.com/about.html → about.html
  https://<did>-<space_id>.pagefire.openhkt.com/docs/guide.html → docs/guide.html
```

页面间跳转使用**相对路径**：

```html
<a href="about.html">关于</a>
<a href="docs/guide.html">指南</a>
<a href="index.html">首页</a>
```

不存在的路径返回真实 **404**。

### SPA（客户端路由）

React / Vue / Svelte 等框架打包后只有一个 `index.html`，路由由 JS 控制。
发布时加 `spa: true`，服务器会把所有未匹配的路径回退到 `index.html`：

```
访问 /dashboard → 找不到 dashboard 文件 → 返回 index.html → JS 渲染 /dashboard 页面
访问 /user/123  → 找不到该文件        → 返回 index.html → JS 渲染用户页
刷新任意路由    → 同上，永远不会 404
```

> **注意**：React/Vite 项目打包时需设置相对路径基准，否则 `/assets/` 绝对路径在子路由下会失效：
> - Vite：`vite.config.js` 中设 `base: "./"` 
> - CRA：`package.json` 中设 `"homepage": "."`

### 对比

| 特性 | MPA（spa: false） | SPA（spa: true） |
|------|:-----------------:|:----------------:|
| 页面跳转 | 服务器返回真实文件 | JS 客户端渲染 |
| 直接访问子路径 | 需要有对应文件 | 始终返回 index.html |
| 刷新子路径 | 需要有对应文件 | 正常，不会 404 |
| 不存在路径 | 真实 404 | 返回 index.html（客户端处理） |
| 适用场景 | 文档站、博客、报告 | React/Vue/Svelte 应用 |

---

## 10 个 MCP 工具

### `deploy_markdown` — 发布单篇 Markdown

最简单的 Markdown 发布方式，传入原始 Markdown 字符串，自动渲染成精美页面。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `markdown` | string | ✅ | Markdown 内容（UTF-8，最大 5 MB） |
| `title` | string | — | 标题，不填则取第一个 `#` 标题 |
| `theme` | `"light"` \| `"dark"` \| `"sepia"` | — | 主题色，默认 `light` |
| `did` | string | — | 自定义 ID，传已有 ID 则原地更新（URL 不变） |
| `access` | `"public"` \| `"password"` | — | 访问控制，默认 `public` |
| `password` | string | — | `access="password"` 时必填 |
| `ttl_days` | integer 1–365 | — | 有效天数，默认 7 天 |
| `pin` | boolean | — | `true` 则永不过期 |

**渲染特性：**

- 自动解析并去掉 YAML/TOML frontmatter（`---`/`+++` 块）
- 支持 GFM（表格、任务列表、删除线等）
- 宽屏（> 1100px）自动在右侧显示**页内目录**（从 `##` / `###` 提取，滚动时高亮当前章节）

**对话示例：**

```
帮我把这篇技术文档发布成网页，用 sepia 主题，永久保留。
把下面这个 README.md 发布出去，标题设为「项目文档」。
```

---

### `deploy_docs` — 发布多篇 Markdown 文档站

多篇 Markdown 文件一键发布为带导航的完整文档站。无需 `index.md`，入口页自动推断。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | array | ✅ | 文件列表（最多 200 篇，总量 ≤ 10 MB） |
| `files[].path` | string | ✅ | 相对路径，必须以 `.md` 结尾，如 `guide.md`、`api/ref.md` |
| `files[].markdown` | string | ✅ | 该页的 Markdown 内容 |
| `title` | string | — | 站点标题，显示在左侧导航顶部 |
| `theme` | `"light"` \| `"dark"` \| `"sepia"` | — | 主题色，默认 `light` |
| `did` | string | — | 自定义 ID，传已有 ID 则原地更新 |
| `access` | `"public"` \| `"password"` | — | 默认 `public` |
| `password` | string | — | 密码保护时填写 |
| `ttl_days` | integer 1–365 | — | 默认 7 天 |
| `pin` | boolean | — | 永久保留 |

**入口页推断规则（不强制要求 `index.md`）：**

```
1. 存在 index.md   → 渲染为 index.html（直接作为入口）
2. 存在 README.md  → 渲染为 readme.html，自动生成跳转用 index.html
3. 都没有          → 取 files[0] 作为入口，自动生成跳转用 index.html
```

**页面布局（宽屏）：**

```
┌──────────────┬───────────────────────────┬──────────────┐
│  左侧导航    │         正文区域           │  右侧目录    │
│  (268px固定) │    max-width: 780px        │  (190px固定) │
│              │                           │              │
│ 📖 站点标题  │  # 当前页标题             │  目录        │
│              │                           │  ## 章节一   │
│ ▶ 首页       │  内容内容内容……           │  ## 章节二   │
│   指南       │                           │   ### 小节   │
│   API 参考   │                           │              │
└──────────────┴───────────────────────────┴──────────────┘
```

- **左侧导航**：固定，列出所有页面，当前页高亮
- **右侧目录**：固定，显示当前页 `##` / `###` 标题，滚动时实时高亮（仅在 ≥ 1280px 宽屏显示）
- **移动端**（< 860px）：左侧导航收起为 `☰` 按钮，右侧目录隐藏

**对话示例：**

```
把这个产品文档（guide.md + api.md + faq.md）发布成文档站，标题「我的产品文档」，永久保留。
把下面三篇 Markdown 发布成文档站，用 dark 主题。
```

---

### `deploy_page` — 发布单 HTML 页面

最常用的工具，传入 HTML 字符串，秒内获得独立 HTTPS 子域名。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `html` | string | ✅ | 完整 HTML 内容（UTF-8，最大 10 MB） |
| `title` | string | — | 标题，便于管理时识别 |
| `access` | `"public"` \| `"password"` | — | 访问控制，默认 `public` |
| `password` | string | — | `access="password"` 时必填 |
| `ttl_days` | integer 1–365 | — | 有效天数，默认 7 天 |
| `pin` | boolean | — | `true` 则永不过期，默认 `false` |
| `spa` | boolean | — | SPA 模式，单页应用通常不需要（默认 `false`） |

**返回值：**

```json
{
  "url": "https://f4vyog-3ixketu6.pagefire.openhkt.com/",
  "did": "f4vyog",
  "domain": "f4vyog-3ixketu6.pagefire.openhkt.com",
  "expires_at": null,
  "pinned": true
}
```

**对话示例：**

```
帮我把这段产品介绍发布成网页，永久保留。
把下面这个 HTML 发布出去，设置密码 hello123，有效期 30 天。
```

---

### `deploy_files` — 发布多文件站点

上传多个文件（index.html + CSS / JS / 图片等），支持子目录结构。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | array | ✅ | 文件列表，必须包含根目录的 `index.html` |
| `files[].path` | string | ✅ | 相对路径，如 `index.html`、`css/style.css` |
| `files[].content` | string | ✅ | 文件内容（UTF-8 字符串或 base64） |
| `files[].encoding` | `"utf8"` \| `"base64"` | — | 默认 `utf8`，二进制文件用 `base64` |
| `title` | string | — | 标题 |
| `access` | `"public"` \| `"password"` | — | 默认 `public` |
| `password` | string | — | 密码保护时填写 |
| `ttl_days` | integer 1–365 | — | 默认 7 天 |
| `pin` | boolean | — | 永久保留 |
| `spa` | boolean | — | SPA 模式，未知路径回退到 index.html（默认 `false`） |

**返回值：**

```json
{
  "url": "https://d9uz2d-3ixketu6.pagefire.openhkt.com/",
  "did": "d9uz2d",
  "domain": "d9uz2d-3ixketu6.pagefire.openhkt.com",
  "file_count": 4,
  "size_bytes": 947,
  "expires_at": null,
  "pinned": true
}
```

**对话示例：**

```
把这个文档站（index.html + guide.html + api.html + style.css）发布出去，永久保留。
把这个 React 应用的文件发布出去，开启 SPA 模式，永久保留。
```

---

### `deploy_zip` — 发布 ZIP 包

上传 base64 编码的 ZIP 文件，自动解压并发布。适合文件数量多或有复杂目录结构的站点。

**限制：** 解压后最大 200 MB，最多 500 个文件。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `zip_base64` | string | ✅ | Base64 编码的 ZIP 文件内容 |
| `title` | string | — | 标题 |
| `access` | `"public"` \| `"password"` | — | 默认 `public` |
| `password` | string | — | 密码保护时填写 |
| `ttl_days` | integer 1–365 | — | 默认 7 天 |
| `pin` | boolean | — | 永久保留 |
| `spa` | boolean | — | SPA 模式，未知路径回退到 index.html（默认 `false`） |

**返回值：**

```json
{
  "url": "https://a62mh4-3ixketu6.pagefire.openhkt.com/",
  "did": "a62mh4",
  "domain": "a62mh4-3ixketu6.pagefire.openhkt.com",
  "file_count": 3,
  "size_bytes": 721,
  "expires_at": null,
  "pinned": true
}
```

**对话示例：**

```
把这个 ZIP 文件里的站点发布出去。
把 dist/ 目录打包成 ZIP 发布，开启 SPA 模式（React 应用），永久保留。
```

---

### `list_deployments` — 列出所有部署

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `include_expired` | boolean | — | 是否包含已过期的部署，默认 `false` |

**返回值：** 部署列表，每项包含 `did`、`url`、`title`、`pinned`、`spa`、`expires_at`、`file_count`、`size_bytes`。

**对话示例：**

```
列出我所有的发布页面。
列出全部部署，包括已过期的。
```

---

### `get_deployment` — 查看部署详情

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `did` | string | ✅ | 部署 ID（6 位，如 `f4vyog`） |

**返回值：** 完整部署信息，含 URL、访问控制、`spa` 模式、文件数、大小、过期时间。

**对话示例：**

```
查看 f4vyog 这个部署的详情。
```

---

### `pin_deployment` — 永久保留部署

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `did` | string | ✅ | 部署 ID |

**对话示例：**

```
把 f4vyog 这个页面设为永久保留。
```

---

### `delete_deployment` — 删除部署

删除部署及其所有文件，不可恢复。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `did` | string | ✅ | 部署 ID |

**对话示例：**

```
删除 f4vyog 这个页面。
```

---

### `set_access` — 修改访问控制

切换公开 / 密码保护模式，无需重新发布。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `did` | string | ✅ | 部署 ID |
| `access` | `"public"` \| `"password"` | ✅ | 新的访问模式 |
| `password` | string | — | `access="password"` 时必填 |

**对话示例：**

```
把 f4vyog 改成密码保护，密码设为 secret888。
把 f4vyog 改回公开访问。
```

---

### `set_space_id` — 自定义域名标识

将你的 space_id 改为自定义名称，让所有部署 URL 中的固定段变得可读。

> ⚠️ **注意**：修改后所有已发布的 URL 立即失效，需要重新分享新地址。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `space_id` | string | ✅ | 自定义标识：4–20 位，仅 `[a-z0-9-]`，不能以 `-` 开头/结尾，不能含 `--` |

**规则：**
- ✅ 合法：`myteam`、`project-alpha`、`ai2026`
- ❌ 非法：`my--team`（连续横线）、`-team`（横线开头）、`a`（太短）、`mcp`（保留字）
- ❌ 占用：已被其他 token 使用的名称会返回 `SPACE_ID_TAKEN` 错误

**URL 变化示例：**

```
修改前：https://f4vyog-3ixketu6.pagefire.openhkt.com/
修改后：https://f4vyog-myteam.pagefire.openhkt.com/
```

**对话示例：**

```
把我的 space_id 改成 myteam。
把域名标识改成 project-alpha，让 URL 更好认。
```

---

## 典型使用场景

### 场景一：AI 生成报告后即时发布

```
帮我生成一份关于 2026 年 AI 趋势的市场报告，
生成后直接发布成网页，用漂亮的样式，永久保留。
```

### 场景二：多页文档站

```
把这个产品文档（首页 + 指南 + API 参考 + FAQ）发布成文档站，
页面间可以相互跳转，永久保留。
```

文件用相对路径互相引用：`<a href="guide.html">指南</a>`

### 场景三：React/Vue SPA 应用

```
我用 npm run build 生成了 dist/ 目录，
把它打包成 ZIP 发布到 PageFire，开启 SPA 模式，永久保留。
```

### 场景四：内部文档密码保护

```
把这份季度财务摘要发布成网页，设密码 Q2-2026，有效期 30 天。
```

### 场景五：批量清理临时页面

```
列出所有我发布的页面，把超过 14 天前创建的非 pin 页面都删掉。
```

---

## URL 格式说明

所有发布的页面 URL 格式为：

```
https://<did>-<space_id>.pagefire.openhkt.com/
```

- `did`：6 位随机部署 ID（每次发布唯一）
- `space_id`：8 位 Token 级别的不透明 ID（与你的 Token 绑定）
- 两者均为 `[a-z0-9]` 字符，不含连字符

多页面站点的子页面路径直接拼在域名后：

```
https://<did>-<space_id>.pagefire.openhkt.com/about.html
https://<did>-<space_id>.pagefire.openhkt.com/docs/guide.html
```

---

## 限制说明

| 项目 | 限制 |
|------|------|
| 单 HTML 最大体积 | 10 MB |
| ZIP 解压后最大体积 | 200 MB |
| ZIP 最多文件数 | 500 个 |
| 单 Token 最多部署数 | 100 个 |
| 单 Token 总存储上限 | 200 MB |
| 默认有效期 | 7 天（`pin: true` 则永久） |
| 允许的文件扩展名 | html, css, js, json, txt, md, xml, svg, png, jpg, jpeg, gif, webp, ico, woff, woff2, ttf, eot, mp4, webm, pdf |

---

## 常见问题

**Q: 多页面站点页面间怎么跳转？**
用相对路径 `href="about.html"` 或 `href="docs/guide.html"`。URL 就是 `https://<域名>/about.html`，服务器直接返回对应文件。不要用 `href="/about.html"` 绝对路径，在发布的子域名下可能会指向错误位置。

**Q: SPA 和 MPA 怎么选？**
- 内容是多个独立 HTML 文件（文档、博客）→ MPA，不开 spa
- 内容是 React/Vue 等框架打包产物 → SPA，开 spa: true

**Q: `pin` 和 `ttl_days` 同时设置会怎样？**
`pin: true` 时 `ttl_days` 被忽略，页面永久保留。

**Q: 密码保护怎么访问？**
需要在 HTTP 请求头中携带 `X-Passphrase: <密码>` 才能访问。直接在浏览器打开会收到 401 响应。

**Q: 发布后能更新内容吗？**
目前不支持原地更新，需重新发布（会得到新的 `did` 和 URL），然后删除旧的部署。

**Q: 支持自定义域名吗？**
当前版本不支持，每次发布使用随机子域名。

**Q: 上传的文件在服务器上执行吗？**
不会。服务器只静态伺服文件，用户上传的 HTML / JS 只在访客浏览器中运行，服务器侧永远不执行用户代码。

**Q: MCP 报 “Failed to connect”，但浏览器能打开域名、`curl`/Node 也能访问，怎么回事？**
这通常**不是服务器问题**，而是 **MCP 客户端运行时的 TLS 握手被网络中间盒（DPI）按指纹拦截**。

排查要点：
- 浏览器（BoringSSL 指纹）、Node（OpenSSL 指纹）能连 → 说明服务器、证书、域名、token 全部正常。
- 个别 MCP 客户端内置的 TLS 栈（如某些版本打包进 Bun，或 Windows 原生 `schannel`）指纹较冷门，会被 DPI 直接 RST（表现为秒级 `ECONNRESET`）。
- 同一个客户端**升级后突然连不上**，常见原因就是新版本换了运行时 / TLS 栈，指纹随之改变。

解决：用上面 **「方式二：stdio 桥接」**。`mcp-remote` 跑在本机 Node（OpenSSL 指纹）上代发 HTTPS 请求，正好绕开这类按指纹拦截，且无需改服务端、无需 SSH 隧道。

> 若要面向大量、网络环境各异的用户分发，更稳的做法是在 MCP 端点前再套一层 CDN（如 Cloudflare）：客户端握手对象变为 CDN 边缘（浏览器式指纹 + anycast IP），可规模化穿透 DPI，再由 CDN 回源到自托管服务器。
