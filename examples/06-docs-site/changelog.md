# 更新日志

## v0.3（当前）

- **Playground**：在线测试全部 MCP 工具，支持文件上传，无需配置 Claude
- **用户注册 / 控制台**：支持自助注册、自助申请 API Key，控制台管理所有 Key
- **邀请码机制**：可配置邀请码限制注册，可绑定来源
- **自定义 space_id**：创建 Key 时可指定自己的 space_id（查重，全局唯一）
- **MCP 连接测试**：控制台每个 Key 旁可一键测试 MCP 连接是否正常

## v0.2

- **`deploy_markdown`**：Markdown → 精致排版网页，三主题（light / dark / sepia）
- **`deploy_docs`**：多篇 Markdown → 带侧边导航的文档站
- **`did` 别名**：所有发布工具支持 `did` 参数，复用时原地更新 URL 不变
- **Session 认证**：httpOnly Cookie，30 天有效期
- **token_enc**：注册/创建 Key 时完整显示一次明文，DB 只存哈希

## v0.1

- `deploy_page` / `deploy_zip` / `deploy_files` 三个基础工具
- 密码保护（access + password）
- TTL 自动过期、Pin 永久保留
- SPA 客户端路由模式（spa: true）
- Streamable HTTP transport，Bearer Token 鉴权
- SQLite WAL 模式，单进程三角色（MCP + HTTP + 数据库）

---

**返回**：[首页](./index.md)
