# @openhkt/pagefire-mcp

把你的 MCP 客户端(Claude / Cursor 等)接入托管版 **PageFire** 的 stdio 连接器。

一个本地 stdio MCP 进程,把所有 JSON-RPC 消息透明转发到 PageFire 的 Streamable HTTP 端点,并自动带上你的 Bearer Token。

## 为什么需要它

PageFire 原生支持 **HTTP 直连**(`type: http`),大多数情况首选那个。但某些 MCP 客户端内置了特殊运行时(如 Bun),其 TLS 指纹会被网络中间盒(DPI)重置,导致直连报 `Failed to connect`。

本连接器跑在你系统的 **Node(OpenSSL)** 上,通过 stdio 桥接,天然绕过这类问题——而服务端、Token、工具完全不变。

## 使用

在 MCP 客户端配置中(如 `.mcp.json`):

```json
{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "@openhkt/pagefire-mcp"],
      "env": { "PAGEFIRE_TOKEN": "pf_你的token" }
    }
  }
}
```

Token 只通过 **环境变量** 传入,不进 `args`——既不会在进程列表(`ps`)里泄露,也避免了 header 拼接被空格拆断的坑。

## 环境变量

| 变量 | 必填 | 说明 |
|------|:---:|------|
| `PAGEFIRE_TOKEN` | ✅ | 你的 `pf_` 开头 Bearer Token |
| `PAGEFIRE_URL` | — | 端点覆盖(自托管用户),默认 `https://mcp.pagefire.openhkt.com/mcp` |
| `PAGEFIRE_DEBUG` | — | 设为 `1` 时把诊断日志打到 stderr |

## 前置要求

- Node.js ≥ 18

## License

MIT
