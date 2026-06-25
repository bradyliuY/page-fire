# 示例：单页落地页

**场景**：AI 生成一个产品落地页，立即发布为公网 HTTPS 页面。

**使用工具**：`deploy_page`（单 HTML 字符串，最快）

## 对 AI 说

```
帮我把 examples/01-landing-page/index.html 的内容发布成网页，
标题设为"产品落地页"，永久保留。
```

## 手动发布（curl）

```bash
curl -X POST https://mcp.pagefire.openhkt.com/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{
    \"name\":\"deploy_page\",
    \"arguments\":{
      \"html\":\"$(cat index.html | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' | tr -d '\"')\",
      \"title\":\"产品落地页\",
      \"pin\":true
    }
  }}"
```

## 适用场景

- AI 生成的报告、摘要、演示稿
- 活动落地页、邀请函
- 个人简介页
- 快速原型验证
