# 示例：多页面文档站（MPA）

**场景**：发布带侧边栏导航的多页文档站，页面间通过 `<a href>` 跳转，每个页面是独立 HTML 文件。

**使用工具**：`deploy_files`（多文件，不开 SPA 模式）

## 文件结构

```
index.html   # 快速开始
guide.html   # 使用指南
api.html     # API 参考
faq.html     # 常见问题
style.css    # 共享样式
```

## 对 AI 说

```
把 examples/02-mpa-docs/ 目录下的所有文件发布成文档站，
标题"产品文档"，永久保留。不需要开 SPA 模式。
```

## 关键点

- `spa: false`（默认）：不存在的路径返回真实 404，适合文档站
- 页面间用相对路径 `href="guide.html"` 跳转，不要用绝对路径
- 共享 CSS 用 `<link rel="stylesheet" href="style.css">` 引用

## 适用场景

- 产品文档、API 文档
- 博客（每篇文章一个 HTML）
- 活动页面集合
- 报告合集
