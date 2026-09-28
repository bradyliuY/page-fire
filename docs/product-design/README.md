# 产品设计素材

这个目录放**设计侧**的东西，不放实现文档：

| 内容 | 说明 |
|---|---|
| `brand/` | 品牌资产 —— `pagefire-logo.png`（图标）、`pagefire-design.png`（横版组合） |
| *(待补充)* | 后续的产品设计稿、交互说明、界面规范都归到这里 |

> 契约、架构与部署分别见 [`../design.md`](../design.md)、[`../../CLAUDE.md`](../../CLAUDE.md)、[`../DEPLOY.md`](../DEPLOY.md)。

## 与代码的关系

品牌图**同时存在两份**，运行时不读这里的文件：

1. **本目录的 PNG** —— 源文件，人看的。
2. **`src/http/assets.ts` 里内嵌的 base64** —— 服务器真正服务的那份，对应 `/favicon.ico`、`/favicon.png`、`/apple-touch-icon.png` 等。

第二份不是把第一份读出来 base64 一下，而是**图像处理的派生物**：

| 导出 | 怎么来的 |
|---|---|
| `LOGO_PNG` | `pagefire-design.png` 把 navy 背景抠成透明 + alpha 裁剪 |
| `FAVICON_PNG` | `pagefire-logo.png` 裁内容 + 补成方形 + 缩到 64×64 |
| `FAVICON_32_PNG` | 上面那份的 32×32 降采样 |
| `APPLE_TOUCH_ICON_PNG` | 180×180 重渲染 |
| `FAVICON_ICO` | 16/32/48/64 四尺寸打包成**真 ICO**（爬虫在 `/favicon.ico` 期待真 ICO） |

所以**换了本目录的图，线上不会有任何变化** —— 改图的完整流程见
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md#品牌素材)。
