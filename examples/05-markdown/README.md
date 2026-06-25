# 示例：Markdown 一键渲染

**场景**：手里有一篇 Markdown（文章、README、报告），想一键变成排版精致的网页，不写任何 HTML/CSS。

**使用工具**：`deploy_markdown`

## 对 AI 说

```
把 examples/05-markdown/article.md 用 deploy_markdown 发布成网页，
暗色主题，永久保留。
```

## 手动发布（curl）

```bash
curl -X POST https://mcp.pagefire.openhkt.com/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{
    \"name\":\"deploy_markdown\",
    \"arguments\":{
      \"markdown\":\"$(python3 -c 'import sys,json; print(json.dumps(open(\"article.md\",encoding=\"utf-8\").read()))' | sed 's/^\"//;s/\"$//')\",
      \"title\":\"从零理解 RAG\",
      \"theme\":\"dark\",
      \"pin\":true
    }
  }}"
```

## 关键点

- **三种主题**：`light`（默认）/ `dark` / `sepia`
- 支持 GFM：表格、任务列表、代码块、引用
- `title` 不传时自动取首个 `#` 标题
- 渲染在发布时完成，输出纯静态 HTML（服务端不执行用户代码）
- 支持 `did` 原地更新：改完 Markdown 用同一个 `did` 重发，URL 不变

## 适用场景

- 技术文章、博客单篇
- 项目 README 在线展示
- 会议纪要、周报、调研报告
