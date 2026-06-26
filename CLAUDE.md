# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/001-pagefire-mcp-publisher/plan.md
<!-- SPECKIT END -->

## 项目状态

**PageFire** —— 通过 MCP 一键把 HTML / 静态包发布成公网可访问网页的自托管静态发布服务(类 EdgeOne Pages,但自托管、多租户、即发即得)。

⚠️ **当前处于设计阶段:仓库里还没有任何代码,只有设计与部署文档。** 实现尚未开始;动手写代码前必读 `docs/design.md`(权威设计,所有架构决策已确认)。计划技术栈:**TypeScript + 官方 `@modelcontextprotocol/sdk` + better-sqlite3**,复用服务器现有 nginx。

## ⚠️ 操作安全(最高优先级,必须遵守)

1. **破坏性命令必须先经用户同意**:任何 `rm -rf`、`rm` 通配删除、`DROP`/批量 `DELETE`、`mv`/覆盖数据、`git reset --hard`、`git push --force`、`pm2 delete`、改/删 nginx·证书·`.env` 等**不可逆或影响线上数据的操作,执行前必须明确征得用户同意**,不得自作主张。
2. **绝不对数据目录用通配删除**:`/var/pagefire/sites`、`pagefire.db` 是线上用户数据。清理测试数据只能删**明确的单个 `token_id`/`did` 路径**,**严禁** `rm -rf /var/pagefire/sites/*` 这类通配。
   - 教训:曾因 `rm -rf /var/pagefire/sites/*` 误删全部 47 个部署的静态文件(DB 元数据尚在,可经相同 did 重发复原)。
3. 在线上服务器(`8.163.52.153`)上操作前先想清楚影响面;只动 PageFire 自己的进程/目录,**绝不碰 Luminar**(backend/storefront/nginx)。

## 文档地图

- `docs/design.md` —— **权威设计文档**。架构、安全模型、SQLite 数据模型、MCP 工具接口、代码结构(§11)、设计补遗(§12)、路线图。改动架构前先改这里。
- `docs/deploy/`（**本地保留,不入库**,含服务器敏感信息) —— 完整部署手册 `PAGEFIRE_DEPLOY.md`(域名/证书/nginx/PM2 可执行步骤、与 Luminar 同机共存约束),以及私钥、SSH 隧道、备份脚本 `backup.sh`。

## 必须守住的架构约束(违反会破坏安全模型或撞车线上服务)

1. **纯静态,服务器侧绝不执行用户代码**(无 PHP/SSR)。这是整个安全模型的基石——用户 JS 只在访客浏览器跑。任何"在服务器跑用户内容"的需求都应另起独立受限服务,不能混入本服务。
2. **token 密钥(`pf_xxx`)永不进 URL**。域名里只用与 token 多对一映射的不透明随机 `space_id`(可轮换);DB 只存 token 哈希。URL 形如 `https://<did>--<space_id>.pagefire.openhkting.com/`,全随机抗枚举。
3. **同机与 Luminar 共存,不得动 Luminar**:nginx(docker, host network)独占 80/443 且归 Luminar 管;PageFire 只能往 nginx **追加** server 块、往 PM2 **加**一个进程、往 certbot 目录加证书。两个写入面只绑 `127.0.0.1`(静态服务 4000 / MCP 4100),不与 Luminar 的 3000/9000 冲突。
4. **单进程三角色**:同一 Node 进程并行启动「MCP 写入面(经 nginx + Bearer token 暴露 `mcp.pagefire.openhkting.com`)」+「对外只读静态面(`*.pagefire`)」;CLI 是另起的一次性进程。三者共享 better-sqlite3(**开 WAL**,以支持多进程读写)。
5. **MCP 必须用 Streamable HTTP transport**,不能用 stdio(服务器在远端、客户端在本地,stdio/127.0.0.1 都连不上)。
6. **每个 deployment 挂在独立子域名根**(而非路径),让 HTML/zip 内的绝对路径 `/css/x.css` 天然正确。
7. **上传写盘必须原子化**(写 tmp → 校验 → rename),并做路径穿越 / Zip Slip / zip bomb / 类型白名单 / SVG 清洗校验。
8. 服务器是 Alibaba Cloud Linux 8:**无 apt,用 yum/dnf**;内存仅 1.8GB、余量 ~400MB,PM2 须设 `--max-memory-restart`。

## 数据 / 代码分离

- 代码部署在 `/opt/pagefire`(只放 `dist/` + `node_modules` + `.env`)。
- 数据在 `/var/pagefire`:`sites/<token_id>/<did>/`(纯静态,对外只读)+ `pagefire.db`(SQLite)。文件布局用内部 `token_id` 而非 `space_id`,这样轮换 space_id 不需要改目录。

## DNS / 证书(阿里云)

根域名托管在阿里云 DNS。需要:一条泛解析 `*.pagefire A <your-server-ip>`;通配证书 `*.pagefire.<yourdomain>` 用 **acme.sh + 阿里云 DNS-01**(`dns_ali`,需 RAM 子账号 AccessKey)自动签发与续期。`mcp.pagefire.<yourdomain>` 被同一泛解析与通配证书覆盖,无需单独配置。

## 构建与运行命令

```bash
pnpm install          # 安装依赖
pnpm build            # tsc → dist/
pnpm start            # node dist/index.js (同时启动 MCP:4100 + HTTP:4000)
pnpm dev              # tsx watch 开发模式
pnpm test             # vitest run (全部测试)
pnpm test:unit        # vitest run test/unit
pnpm test:integration # vitest run test/integration
```

CLI (需先 pnpm build):
```bash
node dist/cli/index.js token create --slug <name> [--label <text>]
node dist/cli/index.js token list
node dist/cli/index.js token disable --slug <name>
node dist/cli/index.js token rotate --slug <name>
node dist/cli/index.js gc
```
