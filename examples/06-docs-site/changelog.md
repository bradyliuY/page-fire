# 更新日志

## v2.1.0（2026-06-10）

**新增**
- `GET /tasks/search` 支持全文检索，参数 `q` 匹配标题和描述
- 任务支持 `watchers` 字段，关注人变更时收到通知
- Webhook 新增 `task.due_date_approaching` 事件（截止前 24h）

**改进**
- 批量创建接口（`POST /tasks/batch`）单次上限从 20 提升至 50
- 列表接口响应新增 `total_count` 字段（不影响已有代码）

## v2.0.0（2026-04-01）🔴 Breaking Change

**Breaking Changes**
- 所有 ID 从数字改为前缀字符串（如 `12345` → `task_01hx9v`），请更新存储字段类型
- `/v1/` 接口将于 2026-10-01 停止服务，请迁移至 `/v2/`
- 鉴权方式从 `?api_key=` 查询参数改为 `Authorization: Bearer` Header

**新增**
- 项目（Projects）资源独立为一级对象，支持 CRUD
- Webhook 签名验证（`X-TaskFlow-Signature`）
- 游标分页替代偏移分页，性能提升明显

**迁移指南**：[v1 → v2 迁移文档](https://docs.taskflow.io/migration-v2)

## v1.3.0（2025-11-15）

- 新增任务标签（Labels）支持，每个任务最多 10 个
- 优先级字段新增 `urgent` 级别
- 修复：分配人删除账号后任务列表报错的问题

## v1.0.0（2025-06-01）

初始版本发布，支持任务的基础 CRUD 操作。

---

**返回**：[首页](./index.md)
