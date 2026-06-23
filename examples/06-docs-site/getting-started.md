# 快速开始

本指南帮你在 5 分钟内完成注册、获取 API Key，并在 Claude 里发布第一个网页。

## 第一步：注册账号

访问 [https://pagefire.openhkt.com](https://pagefire.openhkt.com)，在首页表单填写：

- **用户名**：3-20 位字母数字（唯一）
- **密码**：至少 8 位
- **邀请码**：如有，填写；无邀请码留空也可注册

注册成功后，页面会显示你的第一个 **API Key**（格式 `pf_xxxxxx`）。

> **重要**：API Key 只在注册时完整显示一次，请立即复制保存。进入控制台后可以申请更多 Key，但已有 Key 只显示末 4 位。

## 第二步：获取更多 API Key（可选）

登录后进入 [控制台](https://pagefire.openhkt.com/dashboard)：

1. 点击「+ 新建 API Key」
2. 填写备注名（如"Claude Desktop"）
3. 可选：自定义 space_id（默认随机生成）
4. 点击「创建」，复制 Key

每个 Key 对应一个独立的子域空间，你在该 Key 下发布的所有站点都在这个空间里。

## 第三步：接入 Claude Desktop

在你的项目目录（或全局）创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.pagefire.openhkt.com/mcp",
      "headers": {
        "Authorization": "Bearer pf_你的API_Key"
      }
    }
  }
}
```

重启 Claude Desktop，在对话框右下角可以看到 PageFire 工具已激活。

## 第四步：发布第一个网页

在 Claude 里直接说：

> "帮我把下面这段 Markdown 发布成网页，用 sepia 主题：\n\n# Hello PageFire\n\n这是我的第一个 MCP 发布的页面！"

Claude 会自动调用 `deploy_markdown`，几秒后返回：

```
✅ 发布成功！
访问地址：https://xxxxx-yourspace.pagefire.openhkt.com/
```

## 接入 Cursor

在 Cursor 设置里找到 MCP，添加：

```json
{
  "pagefire": {
    "type": "http",
    "url": "https://mcp.pagefire.openhkt.com/mcp",
    "headers": {
      "Authorization": "Bearer pf_你的API_Key"
    }
  }
}
```

## 在 Playground 测试

不想配置 Claude？直接在 [Playground](https://pagefire.openhkt.com/playground) 的「测试」标签里测试每个工具——无需安装任何客户端。

---

**下一步**：阅读 [工具参考](./api.md) 了解所有工具的完整参数。
