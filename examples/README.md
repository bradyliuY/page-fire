# PageFire 示例集

按场景选择合适的示例：

| 示例 | 工具 | SPA | 说明 |
|------|------|-----|------|
| [01-landing-page](./01-landing-page/) | `deploy_page` | ❌ | 单页落地页、AI 生成报告 |
| [02-mpa-docs](./02-mpa-docs/) | `deploy_files` | ❌ | 多页文档站，页面间 `<a href>` 跳转 |
| [03-spa-app](./03-spa-app/) | `deploy_zip` | ✅ | React/Vue 打包产物，客户端路由 |
| [04-password-protected](./04-password-protected/) | `deploy_page` | ❌ | 密码保护内部文档 |

## 如何选择工具

```
内容是单个 HTML 字符串？
  → deploy_page（最快）

内容是多个文件（HTML + CSS + JS）？
  → deploy_files（逐文件传输）
  → deploy_zip（打包后传输，适合大量文件）

需要客户端路由（React Router / Vue Router）？
  → 加 spa: true
```
