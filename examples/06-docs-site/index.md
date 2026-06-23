# PageFire 用户文档

**PageFire** 是一个自托管的 MCP 静态发布服务，让 AI 助手（Claude、Cursor 等）通过 MCP 协议直接把 HTML / Markdown / ZIP 发布成公网 HTTPS 页面。

## 快速导航

- [快速开始](./getting-started.md) — 5 分钟完成注册、获取 API Key、接入 Claude
- [工具参考](./api.md) — 全部 9 个 MCP 工具的参数说明
- [使用技巧](./guide/tips.md) — did 别名、密码保护、配额管理
- [更新日志](./changelog.md) — 版本记录

## 核心特性

| 特性 | 说明 |
|------|------|
| 即时上线 | 发布调用完成即可访问，无 CI/CD 等待 |
| 链接稳定 | `did` 别名让 URL 在多次更新后保持不变 |
| 多种格式 | HTML · Markdown · 多文件 · ZIP 打包产物 |
| 访问控制 | 公开 / 密码保护 / 私有，随时切换 |
| 文档站 | 多篇 Markdown 自动生成带侧边导航的文档站 |

## 服务地址

| 用途 | 地址 |
|------|------|
| 主页 / 注册 | `https://pagefire.openhkt.com` |
| MCP 端点 | `https://mcp.pagefire.openhkt.com/mcp` |
| Playground | `https://pagefire.openhkt.com/playground` |
| 已发布站点 | `https://<did>-<space_id>.pagefire.openhkt.com/` |
