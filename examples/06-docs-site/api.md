# API 参考

`deploy_docs` 主要参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `files` | `[{path, markdown}]` | Markdown 页面数组，必须含 `index.md` |
| `title` | string | 站点标题，显示在侧栏顶部 |
| `theme` | enum | `light` / `dark` / `sepia` |
| `did` | string | 站点别名；复用同名原地更新，URL 不变 |
| `pin` | boolean | 永久保留 |

## 返回值

```json
{
  "url": "https://mydocs-<space_id>.pagefire.openhkt.com/",
  "did": "mydocs",
  "updated": false,
  "file_count": 4
}
```

返回 [首页](./index.md)。
