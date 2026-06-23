<!--
Sync Impact Report
- Version change: (template/unversioned) → 1.0.0
- Bump rationale: First concrete ratification of the project constitution (initial adoption).
- Principles defined:
  - I. 纯静态 · 服务器零执行 (Static-Only, Zero Server-Side Execution) — NON-NEGOTIABLE
  - II. 防泄漏的不透明身份 (Secret-Free, Opaque Identity)
  - III. 上传内容一律不可信 (Untrusted-by-Default Uploads)
  - IV. 最小暴露面与进程隔离 (Least Exposure & Process Isolation)
  - V. 不侵扰同机邻居 (Non-Intrusive Co-Tenancy)
- Added sections: Core Principles (5), 技术栈与部署约束, 开发工作流, Governance
- Removed sections: none
- Templates reviewed:
  - .specify/templates/plan-template.md ✅ (Constitution Check is generic placeholder; no edits needed)
  - .specify/templates/spec-template.md ✅ (no constitution-specific references)
  - .specify/templates/tasks-template.md ✅ (no constitution-specific references)
- Deferred TODOs: none
-->

# PageFire Constitution

PageFire 是一个通过 MCP 一键把 HTML / 静态包发布成公网可访问网页的自托管、多租户静态发布服务。
本宪法定义不可妥协的工程与安全底线,优先级高于一切便利性诉求。权威设计见 `docs/design.md`。

## Core Principles

### I. 纯静态 · 服务器零执行 (Static-Only, Zero Server-Side Execution) — NON-NEGOTIABLE

服务器侧 **MUST NOT** 执行任何用户上传的内容:无 PHP、无 SSR、无任何把用户文件当代码跑的路径。
用户 JS 只允许在访客浏览器中运行。对外服务的进程对数据目录 **MUST** 只读。
任何"在服务器端运行用户内容/动态逻辑"的需求 **MUST** 另起独立受限服务,**MUST NOT** 混入本服务。

**Rationale**: 这是整个安全模型的基石——消灭绝大多数 RCE。一旦破例,后续所有隔离都失去意义。

### II. 防泄漏的不透明身份 (Secret-Free, Opaque Identity)

token 密钥(`pf_` 前缀)**MUST NOT** 出现在任何 URL、日志、错误信息或域名中;数据库 **MUST** 只存其哈希。
对外域名 **MUST** 仅由高熵、不透明、可轮换的随机标识构成(`did` 与 `space_id`),
**MUST NOT** 携带可反推租户身份的语义。`space_id` 与 token 为多对一映射且 **MUST** 支持轮换(旧链接失效、token 不变)。

**Rationale**: 链接天然会被转发分享。域名零语义 + 可轮换,才能在泄漏时止血而不波及鉴权密钥。

### III. 上传内容一律不可信 (Untrusted-by-Default Uploads)

每次写盘前 **MUST** 通过:路径穿越防护(拒 `..`/绝对路径/符号链接,canonical 前缀校验)、
Zip Slip 与 zip bomb 防护(解压后总大小/文件数/单文件大小/压缩比上限)、扩展名白名单、SVG 清洗、配额检查。
写盘 **MUST** 原子化(写 tmp → 全量校验 → rename),禁止访客看到半成品部署。任一校验失败 **MUST** 中止并清理。

**Rationale**: 上传面是唯一的攻击者可控输入。校验缺一即可能造成越权写盘或磁盘型 DoS。

### IV. 最小暴露面与进程隔离 (Least Exposure & Process Isolation)

写入面(MCP)与只读对外面(静态服务)**MUST** 分端口且都只绑 `127.0.0.1`,公网仅经 nginx 反代触达。
MCP 写入面对公网开放时 **MUST** 强制逐请求 token 鉴权(Bearer),并具备限流与审计日志。
服务进程 **MUST** 非 root 运行;写权限 **MUST** 仅限数据目录。代码与数据 **MUST** 分离
(代码 `/opt/pagefire`、数据 `/var/pagefire`)。

**Rationale**: 把可写、可达公网的面积压到最小,任何单点被攻破都不应升级为主机沦陷。

### V. 不侵扰同机邻居 (Non-Intrusive Co-Tenancy)

PageFire 与 Luminar 共用同一台服务器。对共享资源 **MUST** 只做加法、不做改动:
只允许向 nginx **追加** server 块、向 PM2 **新增**进程、向 certbot 目录**新增**证书;
**MUST NOT** 修改 Luminar 的 server 块、进程、容器或端口。
全局仅 ~400MB 内存余量,常驻进程 **MUST** 设内存上限(PM2 `--max-memory-restart`)。
HTTP 安全头 **MUST NOT** 使用会波及同根域其它子域的指令(如 `HSTS includeSubDomains`)。

**Rationale**: 线上邻居不可因本服务的部署而中断或被误伤。

## 技术栈与部署约束

- 实现语言/SDK:**TypeScript + 官方 `@modelcontextprotocol/sdk` + better-sqlite3**(开 WAL,支持多进程读写)。
- 入口:**nginx**(复用现有,唯一 80/443 入口);**MUST NOT** 引入会争抢 80/443 的第二个 web server。
- MCP 传输:**MUST** 使用 Streamable HTTP transport(服务器在远端,stdio / 127.0.0.1 不可达);经 `mcp.pagefire.openhkting.com` 暴露。
- 对外 URL 形态:`https://<did>--<space_id>.pagefire.openhkting.com/`,每个 deployment 独立子域名根(保证内部绝对路径正确、同源隔离)。
- TLS:`*.pagefire.openhkting.com` 通配证书,acme.sh + 阿里云 DNS-01 自动签发与续期。
- 运行环境:Alibaba Cloud Linux 8(**无 apt,用 yum/dnf**)。
- 临时发布默认过期(默认 7 天),由定时 `gc` 清理;`pin` 转永久。

## 开发工作流

- 任何架构性改动 **MUST** 先更新 `docs/design.md`(权威设计),再落地代码或部署文档。
- 部署相关的具体步骤归 `docs/deploy/PAGEFIRE_DEPLOY.md`;设计与部署文档 **MUST** 保持一致。
- 通过本仓库的 Spec Kit 流程(specify → plan → tasks → implement)推进特性;
  每个 plan 的 Constitution Check **MUST** 逐条核对上述五项原则,违反项 **MUST** 在 Complexity Tracking 中显式论证或改设计。
- 涉及安全模型(原则 I–IV)的改动属高风险,**MUST** 经显式评审,不得以"便利/性能"为由弱化。

## Governance

- 本宪法的效力高于其它一切实践与便利诉求;冲突时以本宪法为准。
- 修订流程:提出改动 → 在 PR/评审中说明影响与迁移方案 → 更新版本号 → 同步受影响的模板与文档。
- 版本语义(语义化版本):
  - **MAJOR**:移除或不兼容地重定义某条原则/治理规则。
  - **MINOR**:新增原则/章节,或对指导做实质性扩展。
  - **PATCH**:措辞澄清、错字修正等非语义调整。
- 合规审查:每个 plan/PR **MUST** 验证是否符合本宪法;复杂度与例外 **MUST** 被论证。
- 运行期开发指导以仓库根 `CLAUDE.md` 为准。

**Version**: 1.0.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-23
