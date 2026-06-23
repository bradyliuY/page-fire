# 使用技巧

## did 别名：让链接永不失效

`did`（Deployment ID）是你给站点起的别名，格式为 `[a-z0-9]{3,32}`（纯小写字母数字，3-32 位，无连字符）。

**使用场景**：

```json
// 第一次发布
{ "markdown": "# 版本 1.0 内容", "did": "weekly-report" }
// → https://weekly-report-abc123.pagefire.openhkt.com/

// 下次更新，同样的 did，URL 完全不变
{ "markdown": "# 版本 2.0 内容", "did": "weekly-report" }
// → https://weekly-report-abc123.pagefire.openhkt.com/（同一个链接！）
```

已经分享出去的链接无需更新，访客下次打开就是最新内容。

## 密码保护内部文档

```json
{
  "html": "...",
  "did": "internal-report",
  "access": "password",
  "password": "team2024"
}
```

访客打开页面时会看到密码输入框，输入正确密码后才能访问。密码验证在客户端进行，无需服务器参与。

也可以事后加密码，不用重新发布：

```json
// 用 set_access 工具
{ "did": "internal-report", "access": "password", "password": "team2024" }
```

## 文档站链接写法

在 `deploy_docs` 里，页面之间的链接写 `.md` 扩展名，系统会自动改写为 `.html`：

```markdown
<!-- index.md -->
- [快速开始](./getting-started.md)  ✅ 会被改写为 getting-started.html
- [API 文档](./api.md)              ✅
- [子目录页面](./guide/install.md)  ✅

<!-- 不要写 .html，发布前系统不知道路径 -->
- [快速开始](./getting-started.html) ❌
```

## SPA 客户端路由

React / Vue 项目使用客户端路由时，需要开启 SPA 模式：

```json
{
  "zip_base64": "...",
  "spa": true,
  "did": "my-react-app"
}
```

SPA 模式下，所有未匹配的路径（如 `/dashboard/settings`）都会返回 `index.html`，让前端路由接管。

## 自动过期（TTL）

临时内容可以设置自动过期：

```json
{
  "html": "...",
  "ttl_days": 7  // 7 天后自动删除
}
```

长期保留的重要内容加 `pin: true` 防止 GC 误删：

```json
{
  "markdown": "...",
  "did": "important-doc",
  "pin": true
}
```

## 查看配额

在[控制台](https://pagefire.openhkt.com/dashboard)可以看到每个 API Key 的部署数量。用 `list_deployments` 工具可以列出所有站点，用 `delete_deployment` 清理不需要的内容。

---

**返回**：[首页](../index.md) | [工具参考](../api.md)
