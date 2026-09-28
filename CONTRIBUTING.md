# Contributing to PageFire

Thanks for your interest! Contributions are welcome.

## Ways to contribute

- **Bug reports** — open an [issue](https://github.com/bradyliuY/page-fire/issues) with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **Code** — fork → branch → PR (see below)
- **Docs** — fixes, clarifications, translations

## Development setup

```bash
git clone https://github.com/bradyliuY/page-fire.git
cd page-fire
pnpm install
cp .env.example .env      # fill in your local values
pnpm dev                  # tsx watch — server reloads on save
```

Run tests:

```bash
pnpm test                 # all tests (vitest)
pnpm test:unit
pnpm test:integration
```

For the `pagefire-mcp` CLI package:

```bash
cd packages/mcp-client
pnpm install
pnpm test
```

## Pull request guidelines

1. One logical change per PR — keep diffs small and reviewable.
2. Run `pnpm test` and `pnpm build` locally before pushing; CI must pass.
3. Follow the existing code style (TypeScript strict, no extra comments).
4. Add or update tests for any new behaviour.
5. Update relevant docs if your change affects user-facing behaviour.

## Architecture constraints

Before submitting a PR that touches the server, read the constraints in [CLAUDE.md](CLAUDE.md) and [docs/design.md](docs/design.md). Key rules:

- The server never executes user-uploaded code (pure static hosting).
- Token secrets (`pf_xxx`) must never appear in URLs or logs; only hashes are stored in the DB.
- Upload paths must use the atomic write pattern (tmp → validate → rename).

## 文档与守卫

本仓库是 **public**，文档和代码一样要守规矩。这一节是改本仓库时才需要知道的，读者向的文档里不写这些。

### 公开边界

已提交的文件只写**架构与做法**，具体坐标一律用占位符 —— `<your-server-ip>`、`<co-tenant-domain>`、`<nginx-container>`、`pf_xxx`。

**主机 IP、SSH 私钥路径、同机其它服务的产品名/域名/容器名/目录**只写进 `docs/deploy/`（已 gitignore，是运维细节的唯一出处）。

这条由 `test/unit/public-docs.test.ts` 在 CI 里强制。同机邻居的名字同样只放在 `docs/deploy/sensitive-terms.txt` —— **词表本身也是秘密**，写进守卫等于守卫自己泄露它。

### 读者向文档必须自给自足

公开读者被邀请去读的文档（根 `README`、`docs/DEPLOY.md`、`docs/MCP_GUIDE.md`、`docs/design.md`、`examples/`、`packages/mcp-client/README.md` 等）**不得提到 `docs/deploy/`**，哪怕只是行内代码。第三方 clone 下来没有那个目录，指过去就是一条走不通的指引。

反面教材是真的发生过：`docs/DEPLOY.md` 第九节教人配备份，却让读者去看 `docs/deploy/backup.sh` —— 而仓库里**从来没提交过**任何 `backup.sh`。修法不是写句「公开仓库里没有这个文件」的免责声明，而是**把读者需要的脚本提交进仓库**（现在就是 [`scripts/backup.sh`](scripts/backup.sh)，文档指向它）。

维护者向的文档（本文件、`CLAUDE.md`、测试）不受此限 —— 它们本来就要讲「运维坐标只放 `docs/deploy/`」这条规则。

因此 `test/unit/docs-links.test.ts` **没有豁免名单**：任何 md 里的相对链接都必须真的能打开。（曾经对 `docs/deploy/` 开过一条豁免，结果恰好把上面那个缺陷护在检查之外 —— 本地能打开、clone 下来是死链，一路绿灯。）

### 每个事实只有一个出处

文档最容易烂的方式，是同一个事实被抄进五个文件、然后改了四个。所以约定每个事实声明一个权威出处，其余位置只写一句、然后链接过去：

| 事实 | 权威出处 | 别再抄到 |
|---|---|---|
| MCP 工具的**参数与用法** | [docs/MCP_GUIDE.md](docs/MCP_GUIDE.md) | README、design.md |
| MCP 工具的**注册与 zod schema** | `src/mcp/server.ts` | 任何 md |
| 环境变量 | [.env.example](.env.example) + `src/config.ts` | DEPLOY.md 只列部署要改的那几个 |
| 允许上传的扩展名 | `src/core/validate.ts`（`ALLOWED_EXTENSIONS`） | MCP_GUIDE 只写分类，不抄全表 |
| 配额**默认值** | `src/core/quota.ts`（`DEFAULT_QUOTA_*`） | 注意实际限额按 token 存在 DB 里，管理员可单独提升 |
| 代码地图与常用命令 | [CLAUDE.md](CLAUDE.md) | design.md 只留指针 |
| 架构决策与数据流 | [docs/design.md](docs/design.md) | — |
| 部署步骤 | [docs/DEPLOY.md](docs/DEPLOY.md) | README 只写一句 |

改了权威出处，顺手全局搜一下有没有别处抄了旧值。

### 守卫测试

`pnpm test` 里有一组守卫，专门防文档与代码悄悄漂移 —— 死链、扩展名表漂移、`.env.example` 漏变量、弯引号、泄露运维坐标等。

**清单与各自职责见 [CLAUDE.md 的「测试」节](CLAUDE.md#测试)。那里是唯一清单，此处不再重复** —— 抄两份必然漂移。

### 没被提交的目录

| 目录 | 为什么不入库 |
|---|---|
| `docs/deploy/` | 含服务器 IP、私钥、nginx/证书操作 —— 唯一存放运维坐标的地方 |
| `specs/`、`.specify/`、`.claude/`、`.agents/`、`.codex/`、`AGENTS.md` | 本地规划草稿与开发工具配置 |

因此公开 clone 里**看不到** `docs/deploy/`。读者向文档不要指向它（见上「读者向文档必须自给自足」）；维护者向文档在行内代码里提它是可以的，但写成 markdown 链接会被链接守卫拦下。

### 新增文档时

1. 先问它是不是**某个已有文档的一节** —— 是的话别新建文件。
2. 新建了就回 [docs/README.md](docs/README.md) 的索引表加一行，否则它就是下一篇孤儿文档。
3. 不要在正文里写真实 IP / 主机名。

### 品牌素材

`docs/product-design/brand/` 的 PNG 是**源文件**，服务器真正服务的是 `src/http/assets.ts` 里内嵌的 base64 **派生物**（抠背景、裁剪、补方、降采样、ICO 打包）。那份数据本身不读源图，所以换图后必须手动重新生成五份派生资源。

`assets.ts` 头部写着 `Auto-generated`，但**生成脚本不在仓库里，这是有意保留的现状**：要复现得引入图像库并逆推出当时的裁切参数，任何一点不同输出就逐字节不同。一个「生成得出来但结果不一样」的脚本比没有更糟 —— 每次运行都改动线上 favicon，还把 diff 变成噪音。

真正危险的是**静默过期**：换了源图却没人重新生成，线上毫无变化、也没有任何东西报错。`test/unit/brand-assets.test.ts` 钉住这一点 —— 它记录 `assets.ts` 生成时两张源图的 SHA-256，源图一变就红。改动顺序是：**先重新生成 `assets.ts` 里的五份资源，再更新测试里的哈希**；只改哈希不改资源，等于把守卫关掉。该守卫同时校验五份 base64 的魔数（PNG / ICO）与互不相同 —— `assets.ts` 只有 26 行却塞着 5 段巨型 base64，粘错一段不会有别的测试发现。

新增图片文件注意：`.gitignore` 默认忽略所有 `*.png` / `*.jpg`（本地截图与草稿不入库），只对 `docs/**` 和 `.github/assets/` 开了例外。放在例外范围外的话，`git add` 会被静默忽略。

## Questions?

Open an issue or start a Discussion — happy to help.
