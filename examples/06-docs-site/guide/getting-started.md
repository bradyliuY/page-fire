# 快速开始

三步把内容发布上线。

## 1. 获取 Token

在控制台注册并创建一个 API Key（`pf_` 开头）。

## 2. 配置 MCP

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.pagefire.openhkt.com/mcp",
      "headers": { "Authorization": "Bearer <你的token>" }
    }
  }
}
```

## 3. 对话发布

> 帮我把这套文档用 deploy_docs 发布成文档站。

完成后即可访问。返回 [首页](../index.md) 或继续看 [API 参考](../api.md)。
