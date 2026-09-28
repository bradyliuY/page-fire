# 产品设计素材

这个目录放**设计侧**的东西,不放实现文档:

| 内容 | 说明 |
|---|---|
| `brand/` | 品牌资产 —— `pagefire-logo.png`(图标)、`pagefire-design.png`(横版组合) |
| *(待补充)* | 后续的产品设计稿、交互说明、界面规范都归到这里 |

> 契约、架构与部署分别见 [`../design.md`](../design.md)、[`../../CLAUDE.md`](../../CLAUDE.md)、[`../DEPLOY.md`](../DEPLOY.md)。

## 与代码的关系(改图前必读)

品牌图**同时存在两份**,运行时不读这里的文件:

1. **本目录的 PNG** —— 源文件,人看的,README 顶部引用的是它。
2. **`src/http/assets.ts` 里的 base64 副本** —— 服务器真正服务的那份,内联成 `/favicon.ico`、`/favicon.png`、`/apple-touch-icon.png` 等。

所以**换了图但没重新生成 `assets.ts`,线上还是旧图**,本目录的改动不会自动生效。

### 那份 base64 不是源图的直译

`assets.ts` 里的五份资源是**图像处理的派生物**,不是把 PNG 读出来 base64 一下:

| 导出 | 怎么来的 |
|---|---|
| `LOGO_PNG` | `pagefire-design.png` 把 navy 背景抠成透明 + alpha 裁剪 |
| `FAVICON_PNG` | `pagefire-logo.png` 裁内容 + 补成方形 + 缩到 64×64 |
| `FAVICON_32_PNG` | 上面那份的 32×32 降采样 |
| `APPLE_TOUCH_ICON_PNG` | 180×180 重渲染 |
| `FAVICON_ICO` | 16/32/48/64 四尺寸打包成**真 ICO**(爬虫在 `/favicon.ico` 期待真 ICO) |

### 所以为什么不补一个生成脚本

`assets.ts` 头部写着 `Auto-generated`,但生成脚本确实不在本仓库里(`scripts/` 下只有 `download-mermaid.mjs` 和 `reset-password.sh`)。**这是有意保留的现状,不是待办**:

要复现上表,得引入图像库并**逆推出当时的裁切/抠图参数**;任何一点参数不同,输出就逐字节不同。一个"生成得出来但结果不一样"的脚本比没有更糟 —— 它会让每次运行都改动线上 favicon,还把 diff 变成噪音。所以那句 `Auto-generated` 描述的是**当初怎么来的**,不是"可重现"。

### 真正被守住的是"静默过期"

危险的不是无法重现,而是:**换了源图却没人重新生成,线上毫无变化、也没有任何东西报错** —— 你以为换了 logo,访客看到的还是旧图。

`test/unit/brand-assets.test.ts` 钉住这一点:它记录 `assets.ts` 生成时两张源图的 SHA-256,源图一变就红,并告诉你该重新生成哪五份资源。它同时校验五份 base64 的魔数(PNG / ICO)与互不相同 —— 26 行文件里塞着 5 段巨型 base64,粘错一段不会有别的测试发现。

改动品牌图时,顺序是:**先重新生成 `assets.ts` 里的五份资源,再更新测试里的哈希**。只改哈希不改资源,等于把守卫关掉。

## 公开边界

本仓库是公开的。这个目录下的文件同样受 `test/unit/public-docs.test.ts` 守卫约束 —— **不要**写入主机 IP、同机其它服务的域名/容器名/路径。运维坐标只放 `docs/deploy/`(已 gitignore)。

## 格式约定

`.gitignore` 默认忽略所有 `*.png` / `*.jpg`(开发过程中的本地截图与草稿不入库),对以下位置开了例外:

- `docs/**/*.png`、`docs/**/*.jpg` ← **品牌资产靠这条规则进仓库**
- `.github/assets/*.png`、`.github/assets/*.jpg`

新增图片前先确认落在例外范围内,否则 `git add` 会被静默忽略。
