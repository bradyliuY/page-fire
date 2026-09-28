# 文档索引

PageFire 的文档入口。**按「你想知道什么」查,不用先猜文件名。**

## 我想……

| 我想…… | 看这里 |
|---|---|
| 先搞懂 PageFire 是什么、长什么样 | [../README.md](../README.md)([English](../README.en.md)) |
| 知道系统怎么设计的、为什么这么设计 | [design.md](design.md) |
| 把 PageFire 部署到自己的服务器 | [DEPLOY.md](DEPLOY.md) |
| 用 MCP 发布页面(工具参数、场景、限制) | [MCP_GUIDE.md](MCP_GUIDE.md) |
| 用 `pagefire` CLI / 连接器 | [../packages/mcp-client/README.md](../packages/mcp-client/README.md) |
| 照着现成例子发布 | [../examples/README.md](../examples/README.md) |
| 改代码前先看懂仓库结构与命令 | [../CLAUDE.md](../CLAUDE.md) |
| 贡献代码 | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| 报告安全漏洞 | [../.github/SECURITY.md](../.github/SECURITY.md) |
| 看品牌资产 / 产品设计素材 | [product-design/README.md](product-design/README.md) |
| 查多域名是怎么落地的 | [plans/2026-09-02-multi-domain-design.md](plans/2026-09-02-multi-domain-design.md) |

## 每个事实只有一个出处

文档最容易烂的方式,是同一个事实被抄进五个文件,然后改了四个。所以这里约定**每个事实声明一个权威出处**,其余位置只写一句、然后链接过去:

| 事实 | 权威出处 | 别再抄到 |
|---|---|---|
| MCP 工具的**参数与用法** | [MCP_GUIDE.md](MCP_GUIDE.md) | README、design.md |
| MCP 工具的**注册与 zod schema** | `src/mcp/server.ts` | 任何 md |
| 环境变量 | [.env.example](../.env.example) + `src/config.ts` | DEPLOY.md 只列部署要改的那几个 |
| 允许上传的扩展名 | `src/core/validate.ts`(`ALLOWED_EXTENSIONS`) | MCP_GUIDE 只写分类,不抄全表 |
| 配额**默认值** | `src/core/quota.ts`(`DEFAULT_QUOTA_*`) | 注意:`quota.ts` 只定义默认值,**实际限额按 token 存在 DB 里**,管理员可单独提升 |
| 代码地图与常用命令 | [../CLAUDE.md](../CLAUDE.md) | design.md 只留指针 |
| 架构决策与数据流 | [design.md](design.md) | — |
| 部署步骤 | [DEPLOY.md](DEPLOY.md) | README 只写一句 |

> 改了权威出处,顺手全局搜一下有没有别处抄了旧值。`pnpm test` 里的文档守卫(见下)能兜住链接与坐标,但兜不住「同一个数字写在两个地方」。

## 公开边界

本仓库是 **public**。所以:

- 已提交的文档只写**架构与做法**,具体坐标一律占位符 —— `<your-server-ip>`、`<co-tenant-domain>`、`<nginx-container>`、`pf_xxx`。
- **主机 IP、SSH 私钥、同机其它服务的产品名/域名/容器名/目录路径**只写进 `docs/deploy/`,该目录已 gitignore,是运维细节的唯一出处。

这条规则由 `test/unit/public-docs.test.ts` 在 CI 里强制,违反即红。

## 没有被提交的目录

| 目录 | 为什么不入库 |
|---|---|
| `docs/deploy/` | 含服务器 IP、私钥、nginx/证书操作 —— 唯一存放运维坐标的地方 |
| `docs/deploy/sensitive-terms.txt` | 同机其它服务的名字/域名。**公开仓库禁词表本身也是秘密** —— 写进守卫等于守卫自己泄露它 |
| `docs/../specs/`、`.specify/`、`.claude/`、`.codex/`、`.agents/` | 本地规划草稿与工具配置 |

因此公开 clone 里**看不到** `docs/deploy/`,指向它的链接会失效 —— 这是预期行为,文档守卫对 `docs/deploy/**` 做了豁免。

## 文档守卫

`pnpm test` 会跑这几条,专门防止文档悄悄烂掉:

| 守卫 | 抓什么 |
|---|---|
| `test/unit/docs-links.test.ts` | 相对链接/图片失效、指向**未提交**的文件 |
| `test/unit/docs-extension-list.test.ts` | `MCP_GUIDE.md` 的扩展名表与 `validate.ts` 白名单漂移 |
| `test/unit/env-example.test.ts` | `.env.example` 漏掉 `config.ts` 会读的变量 |
| `test/unit/public-docs.test.ts` | 泄露主机 IP 或同机其它服务信息(邻居词表在 `docs/deploy/sensitive-terms.txt`,已 gitignore) |
| `test/unit/agents-md-sync.test.ts` | 本地的 `AGENTS.md`(Codex)与 [../CLAUDE.md](../CLAUDE.md) 漂移 |
| `test/unit/brand-assets.test.ts` | 品牌源图换了而 `assets.ts` 里内嵌的派生资源没跟着换(静默过期) |
| `test/unit/html-templates.test.ts` | 内联 HTML 模板里的弯引号 |

## 新增文档时

1. 先问它是不是**某个已有文档的一节** —— 是的话别新建文件。
2. 新建了就回来这张表里加一行,否则它就是下一篇孤儿文档。
3. 不要在正文里写真实 IP / 主机名。
