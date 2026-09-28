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

### ⚠️ 已知缺口

`src/http/assets.ts` 头部写着 `Auto-generated`,但**生成脚本不在本仓库里**(`scripts/` 下只有 `download-mermaid.mjs` 和 `reset-password.sh`)。换图目前只能靠手工重新编码,无法复现。

若再次改动品牌图,建议顺手把生成脚本补进 `scripts/`(读取本目录 PNG → 输出 `assets.ts`),让那句 `Auto-generated` 名副其实。

## 公开边界

本仓库是公开的。这个目录下的文件同样受 `test/unit/public-docs.test.ts` 守卫约束 —— **不要**写入主机 IP、同机其它服务的域名/容器名/路径。运维坐标只放 `docs/deploy/`(已 gitignore)。

## 格式约定

`.gitignore` 默认忽略所有 `*.png` / `*.jpg`(开发过程中的本地截图与草稿不入库),对以下位置开了例外:

- `docs/**/*.png`、`docs/**/*.jpg` ← **品牌资产靠这条规则进仓库**
- `.github/assets/*.png`、`.github/assets/*.jpg`

新增图片前先确认落在例外范围内,否则 `git add` 会被静默忽略。
