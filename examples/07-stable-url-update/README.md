# 示例：链接不变的更新部署

**场景**：发布一个页面、把链接分享出去，之后还要反复改内容——但**链接必须保持不变**。

**关键参数**：`did`（站点别名，所有发布工具通用）

## 工作原理

- 给站点起个名字：`did: "my-report"` →（注意 did 不含连字符，示例用 `myreport`）
- 首次发布：URL 形如 `https://myreport-<space_id>.pagefire.openhkt.com/`
- 之后用**同一个 `did`** 重发 → 原地覆盖，**URL 完全不变**，返回 `updated: true`
- 更新时不传 `pin`/`ttl_days`/`access` 会**保留**原设置

> `did` 规则：3–32 位，仅 `[a-z0-9]`（无连字符，以兼容子域名解析）。
> 被别人占用会返回 `DID_TAKEN`，换个名字即可。

## 对 AI 说

**第一次：**
```
把这份周报发布成网页，did 设为 "weekly"，永久保留。
```

**之后每次更新：**
```
周报内容更新了，用 did "weekly" 重新发布。链接保持不变。
```

## 手动验证（curl）

```bash
# 首次发布
curl -s -X POST https://mcp.pagefire.openhkt.com/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
    "name":"deploy_page","arguments":{"html":"<h1>v1</h1>","did":"weekly","pin":true}}}'

# 再发一次（同 did）→ 同一个 URL，updated:true
curl -s -X POST https://mcp.pagefire.openhkt.com/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
    "name":"deploy_page","arguments":{"html":"<h1>v2</h1>","did":"weekly"}}}'
```

## 适用场景

- 周报 / 月报 / 看板（固定链接，内容滚动更新）
- 活动页（同一推广链接，内容随活动调整）
- 文档站迭代（`deploy_docs` + 固定 `did`）
- 任何「分享一次、长期更新」的页面
