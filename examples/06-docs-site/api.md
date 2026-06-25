# API 参考

所有请求需携带 `Authorization: Bearer tf_your_api_key` Header。

Base URL：`https://api.taskflow.io/v2`

## 任务（Tasks）

### 创建任务

```
POST /tasks
```

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 任务标题，最长 200 字符 |
| `project_id` | string | ✅ | 所属项目 ID |
| `assignee` | string | — | 被分配人邮箱 |
| `due_date` | string | — | 截止日期（ISO 8601，仅日期部分） |
| `priority` | enum | — | `low` / `medium` / `high` / `urgent` |
| `labels` | string[] | — | 标签数组，最多 10 个 |
| `description` | string | — | 任务描述，支持 Markdown，最长 10000 字符 |

**响应**（201 Created）

```json
{
  "id": "task_01hx9v3c",
  "title": "完成 Q2 季报",
  "status": "todo",
  "priority": "high",
  "assignee": { "id": "usr_abc", "email": "wei@company.com", "name": "Wei L." },
  "due_date": "2026-06-30",
  "labels": ["季报", "财务"],
  "created_at": "2026-06-18T09:30:00Z",
  "updated_at": "2026-06-18T09:30:00Z",
  "url": "https://app.taskflow.io/tasks/task_01hx9v3c"
}
```

### 列出任务

```
GET /projects/{project_id}/tasks
```

**查询参数**

| 参数 | 说明 | 默认 |
|------|------|------|
| `status` | 过滤状态：`todo` / `in_progress` / `done` | 全部 |
| `assignee` | 过滤被分配人邮箱 | — |
| `limit` | 每页条数，最大 100 | 20 |
| `cursor` | 分页游标（从上一页响应的 `next_cursor` 获取） | — |

**响应**

```json
{
  "data": [ /* Task 对象数组 */ ],
  "next_cursor": "cur_abc123",
  "has_more": true
}
```

### 更新任务

```
PATCH /tasks/{task_id}
```

只传需要修改的字段，未传字段保持不变。

### 删除任务

```
DELETE /tasks/{task_id}
```

返回 204 No Content。

---

## 项目（Projects）

### 创建项目

```
POST /projects
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 项目名称 |
| `description` | string | — | 项目描述 |
| `members` | string[] | — | 初始成员邮箱列表 |

### 列出项目

```
GET /projects
```

返回当前 API Key 所属工作区下的所有项目。

---

## Webhooks

在控制台配置 Webhook URL 后，以下事件会向该 URL 发送 POST 请求：

| 事件 | 触发时机 |
|------|---------|
| `task.created` | 新任务创建 |
| `task.status_changed` | 任务状态变更 |
| `task.due_date_approaching` | 任务在截止前 24h |
| `task.overdue` | 任务已逾期 |

**Webhook 签名验证**（推荐）：请求头 `X-TaskFlow-Signature` 为 `sha256=HMAC(secret, body)`，用你在控制台设置的 Webhook Secret 验证。

---

**返回**：[首页](./index.md) | [快速开始](./getting-started.md)
