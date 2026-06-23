# PageFire MCP 使用手册

PageFire 通过 [MCP（Model Context Protocol）](https://modelcontextprotocol.io) 让 AI 直接把 HTML / 文件 / ZIP 包发布成公网可访问的 HTTPS 页面。

---

## 快速接入

### 1. 获取 Bearer Token

联系管理员获取一个 `pf_` 开头的 Bearer Token，例如：

```
pf_037812b340f767c4a6997820185733bbb00bb35063459795
```

### 2. 配置 MCP 客户端

在项目根目录创建 `.mcp.json`（**不要提交到 Git**）：

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

配置完成后重新加载 MCP 插件，即可在 Claude / Cursor 等客户端中直接对话发布页面。

---

## 8 个 MCP 工具

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
```

```
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
把这个网站（index.html + style.css + app.js）发布出去，永久保留。
```

---

### `deploy_zip` — 发布 ZIP 包

上传 base64 编码的 ZIP 文件，自动解压并发布。适合打包好的完整站点。

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
```

---

### `list_deployments` — 列出所有部署

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `include_expired` | boolean | — | 是否包含已过期的部署，默认 `false` |

**返回值：** 部署列表，每项包含 `did`、`url`、`title`、`pinned`、`expires_at`、`file_count`、`size_bytes`。

**对话示例：**

```
列出我所有的发布页面。
```

```
列出全部部署，包括已过期的。
```

---

### `get_deployment` — 查看部署详情

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `did` | string | ✅ | 部署 ID（6 位，如 `f4vyog`） |

**返回值：** 完整部署信息，含 URL、访问控制、文件数、大小、过期时间。

**对话示例：**

```
查看 f4vyog 这个部署的详情。
```

---

### `pin_deployment` — 永久保留部署

将某个部署设为永久，清除过期时间。

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
```

```
把 f4vyog 改回公开访问。
```

---

## 典型使用场景

### 场景一：AI 生成报告后即时发布

```
帮我生成一份关于 2026 年 AI 趋势的市场报告，
生成后直接发布成网页，用漂亮的样式，永久保留。
```

AI 会自动调用 `deploy_page`，几秒后返回公网 URL，可直接分享。

### 场景二：内部文档密码保护

```
把这份季度财务摘要发布成网页，设密码 Q2-2026，有效期 30 天。
```

### 场景三：原型演示快速上线

```
我有一个 React 打包好的 dist/ 目录，帮我打包成 ZIP 发布出去。
```

### 场景四：批量清理临时页面

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

---

## 限制说明

| 项目 | 限制 |
|------|------|
| 单 HTML 最大体积 | 10 MB |
| ZIP 解压后最大体积 | 200 MB |
| ZIP 最多文件数 | 500 个 |
| 单 Token 最多部署数 | 100 个 |
| 单 Token 总存储上限 | 200 MB |
| 默认有效期 | 7 天（`pin=true` 则永久） |
| 允许的文件扩展名 | html, css, js, json, txt, md, xml, svg, png, jpg, jpeg, gif, webp, ico, woff, woff2, ttf, eot, mp4, webm, pdf |

---

## 常见问题

**Q: `pin` 和 `ttl_days` 同时设置会怎样？**
`pin=true` 时 `ttl_days` 被忽略，页面永久保留。

**Q: 密码保护怎么访问？**
需要在 HTTP 请求头中携带 `X-Passphrase: <密码>` 才能访问。直接在浏览器打开会收到 401 响应。

**Q: 发布后能更新内容吗？**
目前不支持原地更新，需重新发布（会得到新的 `did` 和 URL），然后删除旧的部署。

**Q: 支持自定义域名吗？**
当前版本不支持，每次发布使用随机子域名。

**Q: 上传的文件在服务器上执行吗？**
不会。服务器只静态伺服文件，用户上传的 HTML / JS 只在访客浏览器中运行，服务器侧永远不执行用户代码。
