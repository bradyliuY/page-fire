# 快速开始

本指南帮你在 5 分钟内完成首次 TaskFlow API 调用。

## 获取 API Key

登录 [TaskFlow 控制台](https://app.taskflow.io/settings/api)，在 **API Keys** 页面点击「生成新 Key」，复制后妥善保存（只显示一次）。

## 第一个请求

创建一个任务：

```bash
curl -X POST https://api.taskflow.io/v2/tasks \
  -H "Authorization: Bearer tf_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完成 Q2 季报",
    "assignee": "wei@company.com",
    "due_date": "2026-06-30",
    "priority": "high"
  }'
```

成功响应（201 Created）：

```json
{
  "id": "task_01hx9v3c",
  "title": "完成 Q2 季报",
  "status": "todo",
  "assignee": { "email": "wei@company.com", "name": "Wei L." },
  "due_date": "2026-06-30",
  "priority": "high",
  "created_at": "2026-06-18T09:30:00Z",
  "url": "https://app.taskflow.io/tasks/task_01hx9v3c"
}
```

## 列出项目下的任务

```bash
curl https://api.taskflow.io/v2/projects/proj_abc/tasks \
  -H "Authorization: Bearer tf_your_api_key"
```

返回数组，默认按 `created_at` 降序排列，每页 20 条（可通过 `?limit=` 和 `?cursor=` 分页）。

## Node.js SDK 示例

```typescript
import { TaskFlow } from '@taskflow/sdk'

const tf = new TaskFlow({ apiKey: process.env.TF_API_KEY })

const task = await tf.tasks.create({
  projectId: 'proj_abc',
  title: '审核合同文件',
  assignee: 'chen@company.com',
  dueDate: '2026-07-01',
})

console.log(task.url) // https://app.taskflow.io/tasks/task_xxx
```

## 常见错误

| 状态码 | 含义 | 处理建议 |
|--------|------|---------|
| 401 | API Key 无效或已过期 | 检查 Authorization header 格式 |
| 403 | 无权限操作该资源 | 确认 Key 拥有对应项目的写权限 |
| 422 | 参数校验失败 | 检查 `errors` 字段获取具体原因 |
| 429 | 超出频率限制 | 等待响应头 `Retry-After` 指定的秒数 |

---

**下一步**：阅读 [API 参考](./api.md) 了解全部端点。
