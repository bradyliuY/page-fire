# 示例：多页 Markdown 文档站

**场景**：把多篇 Markdown 组织成带左侧导航的文档站（GitBook / Docusaurus 风格），页面间可互相跳转。

**使用工具**：`deploy_docs`

## 目录结构

```
06-docs-site/
├── index.md                  # 首页（必须）
├── api.md
├── changelog.md
└── guide/
    └── getting-started.md    # 支持子目录
```

## 对 AI 说

```
把 examples/06-docs-site/ 下的所有 .md 用 deploy_docs 发布成文档站，
站名"PageFire 文档"，暗色主题，did 用 "pfdocs"，永久保留。
```

## 关键点

- **必须包含 `index.md`** 作为首页
- 导航项标签自动取每页首个 `#` 标题，`index` 置顶，当前页高亮
- 页面间 `.md` 链接自动改写为 `.html`（写相对路径即可）
- 子目录会保留（`guide/getting-started.md` → `/guide/getting-started.html`）
- 限制：最多 200 页、Markdown 总量 10 MB
- 用同一个 `did` 重发即原地更新整站，URL 不变

## 适用场景

- 产品文档 / API 文档
- 教程系列、知识库
- 开源项目 wiki
