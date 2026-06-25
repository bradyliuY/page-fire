# MCP 协议详解：让 AI 直接操控工具

> 本文介绍 Model Context Protocol（MCP）的核心原理，以及它如何让 AI 助手像人一样调用外部工具发布网页。

2024 年底，Anthropic 发布了 **Model Context Protocol（MCP）**，一个让 AI 模型与外部工具、数据源通信的开放标准。它的出现解决了一个长期存在的问题：AI 知道该做什么，但够不着外部世界。

## 为什么需要 MCP

在 MCP 之前，AI 调用工具的方式是"函数调用"（Function Calling）。每家模型商自己定义格式，每个产品都要单独适配，工具生态割裂。

MCP 统一了这一切：

```
客户端（Claude / Cursor）  ←→  MCP 协议  ←→  服务器（你的工具）
```

服务器声明自己有哪些工具（Tool），客户端按需调用，返回结构化结果。整个过程标准化，任何支持 MCP 的 AI 客户端都能直接接入任何 MCP 服务器。

## 核心概念

MCP 有三个核心抽象：

| 概念 | 说明 | 类比 |
|------|------|------|
| **Tool** | AI 可以调用的动作 | REST API 的端点 |
| **Resource** | AI 可以读取的数据 | 文件系统 / 数据库 |
| **Prompt** | 可复用的提示词模板 | 函数模板 |

对于发布网页这个场景，用的就是 **Tool**——AI 调用 `deploy_page`、`deploy_markdown` 等工具，服务器执行发布并返回结果。

## 一次完整的工具调用

以 PageFire 的 `deploy_markdown` 为例，整个流程：

```json
// 1. 客户端发现工具（初始化时）
{
  "method": "tools/list",
  "result": {
    "tools": [{
      "name": "deploy_markdown",
      "description": "把 Markdown 渲染成精致排版网页并发布",
      "inputSchema": {
        "type": "object",
        "properties": {
          "markdown": { "type": "string" },
          "theme":    { "type": "string", "enum": ["light","dark","sepia"] },
          "did":      { "type": "string", "description": "可选站点别名" }
        }
      }
    }]
  }
}

// 2. AI 决定调用（tools/call）
{
  "method": "tools/call",
  "params": {
    "name": "deploy_markdown",
    "arguments": {
      "markdown": "# 标题\n正文...",
      "theme": "sepia",
      "did": "my-article"
    }
  }
}

// 3. 服务器返回结果
{
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"url\":\"https://my-article-abc123.pagefire.openhkt.com/\",\"did\":\"my-article\"}"
    }]
  }
}
```

AI 拿到 URL 后，可以直接告诉用户："发布完成，访问 https://my-article-abc123.pagefire.openhkt.com/"。

## Transport：Stdio vs Streamable HTTP

MCP 支持两种传输层：

**Stdio**（标准输入/输出）
- 客户端启动服务器进程，通过 stdin/stdout 通信
- 适合本地工具（文件系统、本地数据库）
- 服务器必须和客户端在同一台机器

**Streamable HTTP**
- 服务器独立运行，客户端通过 HTTP POST + SSE 流式通信
- 适合远程服务
- 多个客户端可以同时连接同一个服务器
- PageFire 使用这种方式，这样远端服务器和本地 AI 客户端才能通信

```
本地 Claude Desktop  →  HTTPS  →  mcp.pagefire.openhkt.com/mcp
                         Bearer Token 鉴权
```

## 安全模型

MCP 工具有潜在的高权限（可以发网络请求、写文件），需要认真对待安全：

- **Bearer Token 鉴权**：每个请求必须携带 `Authorization: Bearer pf_xxx`
- **Token 不进 URL**：Token 只在 HTTP Header 里，URL 只包含不敏感的 `space_id`
- **数据库只存哈希**：Token 明文只在注册时返回一次，DB 里永远只有 SHA-256 哈希
- **只读静态**：发布的文件对外只读，服务器绝不执行用户上传的 HTML/JS

## 在 Claude Desktop 里接入 PageFire

`.mcp.json` 配置：

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.pagefire.openhkt.com/mcp",
      "headers": {
        "Authorization": "Bearer pf_你的token"
      }
    }
  }
}
```

保存后重启 Claude，就能在对话里说：

> "把这份 Markdown 发布成深色主题的网页"

Claude 会自动选择 `deploy_markdown` 工具，参数填好，发布，返回 URL——整个过程无需你写任何代码。

## MCP 的意义

工具调用本身不新鲜，Plugin、Function Calling 早有实现。MCP 的真正价值在于：

1. **标准化**：工具开发者只需实现一次，所有 MCP 客户端都能用
2. **去中心化**：任何人都可以运行自己的 MCP 服务器，不依赖平台审核
3. **组合性**：AI 可以跨多个 MCP 服务器调用工具，完成复杂任务

这正是"AI Native 工作流"的基础设施层。PageFire 把"发布网页"这个动作变成一个 MCP 工具，让 AI 在生成内容的同时就能把它推送到公网——生成即发布，无需人工干预。

---

**延伸阅读**：
- [MCP 官方规范](https://modelcontextprotocol.io)
- [PageFire Playground](https://pagefire.openhkt.com/playground) — 在线测试 MCP 工具调用
- [快速接入文档](https://demodocs-demo.pagefire.openhkt.com/) — 5 分钟完成接入
