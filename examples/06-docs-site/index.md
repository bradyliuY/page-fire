# TaskFlow API 文档

**TaskFlow** 是一个轻量级任务管理服务，提供 REST API 供团队将任务数据集成到自己的工具与工作流中。

本文档由 TaskFlow 工程团队使用 [PageFire](https://pagefire.openhkt.com) `deploy_docs` 工具生成并发布，每次更新文档只需重新发布 Markdown 文件，无需维护任何前端。

## 快速导航

- [快速开始](./getting-started.md) — 5 分钟完成首次 API 调用
- [API 参考](./api.md) — 完整的端点、参数与响应说明
- [使用技巧](./guide/tips.md) — 分页、鉴权、批量操作最佳实践
- [更新日志](./changelog.md) — 版本记录与 Breaking Changes

## 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://api.taskflow.io/v2` |
| 协议 | HTTPS only |
| 鉴权 | Bearer Token（API Key） |
| 响应格式 | JSON |
| 频率限制 | 1000 次 / 分钟（标准版） |

## SDK 支持

TaskFlow 官方提供以下 SDK，也可直接调用 HTTP API：

```bash
npm install @taskflow/sdk      # Node.js / TypeScript
pip install taskflow-python    # Python
```
