# 演示文稿发布示例

使用 `deploy_presentation` 工具发布 PDF 或 PPTX 文件。

## 用法

### MCP 客户端（AI 对话）

```
把这份 PDF 报告发布成网页，永久保留。
把这个 PPTX 演示文稿发布成幻灯片，用 dark 主题。
```

### CLI

```bash
# 发布 PDF
pagefire deploy-presentation report.pdf --pin

# 发布 PPTX（自动提取文字+图片，转幻灯片）
pagefire deploy-presentation slides.pptx --theme=dark --pin
```

### 参数

| 参数 | 说明 |
|------|------|
| `pdf` | Base64 编码的 PDF（与 pptx 二选一） |
| `pptx` | Base64 编码的 PPTX（与 pdf 二选一） |
| `title` | 演示文稿标题 |
| `theme` | light / dark / sepia（仅 PPTX 生效） |
| `pin` | 永久保留 |
| `did` | 自定义 ID，链接不变 |

## 注意事项

- PDF 使用浏览器原生查看器，支持翻页、缩放、下载
- PPTX 在服务端自动提取文本和图片，生成 remark.js 幻灯片
- 原始文件保留为可下载附件
- PPTX 的动画和复杂过渡效果无法还原
- 单文件上限 50 MB
