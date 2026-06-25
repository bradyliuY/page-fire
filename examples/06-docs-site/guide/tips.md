# 使用技巧

## 分页处理

TaskFlow API 使用游标分页（Cursor Pagination），比偏移分页更稳定——新任务插入不会导致结果重复或漏掉。

```typescript
async function getAllTasks(projectId: string) {
  const tasks = []
  let cursor: string | undefined

  do {
    const res = await tf.tasks.list(projectId, { limit: 100, cursor })
    tasks.push(...res.data)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)

  return tasks
}
```

## 批量创建

单次可批量创建最多 50 个任务，减少 HTTP 往返：

```bash
POST /tasks/batch

{
  "tasks": [
    { "title": "任务 A", "project_id": "proj_abc", "assignee": "a@co.com" },
    { "title": "任务 B", "project_id": "proj_abc", "assignee": "b@co.com" }
  ]
}
```

响应包含每个任务的结果（包括失败项），即使部分失败整体也返回 200。

## 频率限制最佳实践

标准版限制 1000 次/分钟。超出限制会返回 429，响应头 `Retry-After` 告诉你等几秒。

推荐做法：

- 批量操作优先于单条循环
- 用指数退避（exponential backoff）重试 429
- 非实时场景使用 Webhook 替代轮询

```typescript
async function withRetry(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn() }
    catch (e: any) {
      if (e.status !== 429 || i === maxRetries - 1) throw e
      await new Promise(r => setTimeout(r, 2 ** i * 1000))
    }
  }
}
```

## Webhook 与轮询的选择

| 场景 | 建议 |
|------|------|
| 任务状态变更时触发通知 | Webhook（实时，无额外 API 消耗） |
| 展示任务列表（用户主动刷新） | 轮询（简单） |
| 后台同步到其他系统 | Webhook + 幂等处理 |

## API Key 权限范围

在控制台可以为每个 API Key 设置权限范围：

- **只读**：适合报表、数据分析脚本
- **读写**：适合集成工具、自动化脚本
- **管理员**：可管理成员、删除项目（谨慎分配）

建议遵循最小权限原则，不同用途使用不同的 Key。

---

**返回**：[首页](../index.md) | [API 参考](../api.md)
