# 工具参考

PageFire 提供 9 个 MCP 工具，覆盖从单页到文档站的所有发布场景。

## 通用参数

以下参数大多数发布工具都支持：

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `did` | string | 随机 | 站点别名 `[a-z0-9]{3,32}`，复用同名时原地更新 URL 不变 |
| `access` | enum | `public` | 访问控制：`public` / `password` / `private` |
| `password` | string | — | 当 `access=password` 时的访问密码 |
| `ttl_days` | number | — | 自动过期天数，留空永不过期 |
| `pin` | boolean | false | 是否永久保留（跳过自动 GC） |

## deploy_page

发布单个 HTML 字符串，最简单最快的发布方式。

```json
{
  "html": "<h1>Hello</h1>",
  "title": "页面标题",
  "did": "my-page"
}
```

**适用场景**：AI 生成的报告、落地页、单页工具。

## deploy_markdown

Markdown → 精致排版网页，内置代码高亮、表格、任务列表。

```json
{
  "markdown": "# 标题\n正文...",
  "title": "文章标题",
  "theme": "sepia",
  "did": "my-article"
}
```

**主题**：`light`（白底）/ `dark`（黑底）/ `sepia`（米黄，阅读友好）

## deploy_docs

多篇 Markdown → 带左侧导航的文档站。

```json
{
  "files": [
    { "path": "index.md", "markdown": "# 欢迎..." },
    { "path": "guide/install.md", "markdown": "# 安装..." },
    { "path": "api.md", "markdown": "# API..." }
  ],
  "title": "我的文档",
  "theme": "light",
  "did": "my-docs"
}
```

**注意**：必须包含 `index.md`，`.md` 链接自动改写为 `.html`。

## deploy_files

逐文件发布多页站点，支持 HTML + CSS + JS 混合。

```json
{
  "files": [
    { "path": "index.html", "content": "<html>...", "encoding": "utf8" },
    { "path": "style.css", "content": "body{...}", "encoding": "utf8" }
  ],
  "did": "my-site"
}
```

**二进制文件**：`encoding` 设为 `base64`，`content` 传 Base64 字符串。

## deploy_zip

上传 ZIP 打包产物，自动解包。适合 React / Vue 等构建输出。

```json
{
  "zip_base64": "UEsDBBQA...",
  "spa": true,
  "did": "my-app"
}
```

**`spa: true`**：开启 SPA 模式，所有未匹配路径 fallback 到 `index.html`，支持 React Router / Vue Router。

## set_access

随时修改已有站点的访问控制，无需重新发布内容。

```json
{
  "did": "my-site",
  "access": "password",
  "password": "secret123"
}
```

## list_deployments

列出当前 space 下所有站点。

```json
{}
```

返回字段：`did`、`url`、`file_count`、`size_bytes`、`created_at`、`access`。

## get_deployment

获取单个站点详情。

```json
{ "did": "my-site" }
```

## delete_deployment

删除站点，释放配额。

```json
{ "did": "my-site" }
```

---

**返回**：[首页](./index.md) | [快速开始](./getting-started.md)
