# PageFire 示例集

按场景选择合适的示例：

| 示例 | 工具 | SPA | 说明 |
|------|------|-----|------|
| [01-landing-page](./01-landing-page/) | `deploy_page` | ❌ | 单页落地页、AI 生成报告 |
| [02-mpa-docs](./02-mpa-docs/) | `deploy_files` | ❌ | 多页文档站，页面间 `<a href>` 跳转 |
| [03-spa-app](./03-spa-app/) | `deploy_zip` | ✅ | React/Vue 打包产物，客户端路由 |
| [04-password-protected](./04-password-protected/) | `deploy_page` | ❌ | 密码保护内部文档 |
| [05-markdown](./05-markdown/) | `deploy_markdown` | ❌ | Markdown 一键渲染成精致网页 |
| [06-docs-site](./06-docs-site/) | `deploy_docs` | ❌ | 多页 Markdown → 带侧栏的文档站 |
| [07-stable-url-update](./07-stable-url-update/) | `did` 参数 | — | 链接不变的更新部署 |
| [08-slides](./08-slides/) | `deploy_markdown` + `mode="slide"` | ❌ | Markdown → 全屏演示幻灯片 |
| [09-presentation](./09-presentation/) | `deploy_presentation` | ❌ | PDF / PPTX 在线演示 |

## 如何选择工具

```
内容是一篇 Markdown（文章 / README / 报告）？
  → deploy_markdown（自动套精致排版，三主题）

要 Markdown 转全屏演示幻灯片？
  → deploy_markdown + mode="slide"（← → 键盘翻页，代码高亮）

多篇 Markdown，要带侧边导航的文档站？
  → deploy_docs（必须含 index.md）

内容是单个 HTML 字符串？
  → deploy_page（最快）

内容是多个文件（HTML + CSS + JS）？
  → deploy_files（逐文件传输）
  → deploy_zip（打包后传输，适合大量文件）

需要客户端路由（React Router / Vue Router）？
  → 加 spa: true

需要分享一次、长期更新、链接不变？
  → 任意发布工具加 did: "yourname"（见 07-stable-url-update）

内容是 PDF / PPTX 文件？
  → deploy_presentation（PDF 浏览器查看，PPTX 自动转幻灯片，见 09-presentation）
```
