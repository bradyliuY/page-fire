# Implementation Plan: PageFire — MCP-Driven Static Site Publisher

**Branch**: `001-pagefire-mcp-publisher` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

---

## Summary

Build a single Node.js/TypeScript service that (1) exposes MCP tools for publishing static HTML/ZIP to unique wildcard subdomains, (2) serves those deployments to visitors via a lightweight HTTP static server, and (3) provides a CLI for operator token management and garbage collection. The service runs alongside Luminar on an existing Alibaba Cloud server, reusing nginx as the TLS-terminating reverse proxy and PM2 as the process manager.

---

## Technical Context

**Language/Version**: TypeScript 5.x targeting Node.js 20 LTS

**Primary Dependencies**:
- `@modelcontextprotocol/sdk` — MCP Streamable HTTP server
- `better-sqlite3` — synchronous SQLite with WAL
- `yauzl` — ZIP extraction with streaming (Zip Slip / zip bomb safe)
- `dompurify` + `jsdom` — SVG sanitization (server-side)
- `vitest` — unit and integration testing

**Storage**: SQLite (`better-sqlite3`), WAL mode. Files on local filesystem under `/var/pagefire/sites/`.

**Testing**: `vitest` for unit tests; integration tests start a real in-process server.

**Target Platform**: Alibaba Cloud Linux 8 (Node.js 20, no apt; use yum/dnf on server).

**Project Type**: Single-process service (MCP server + HTTP static server + CLI in one codebase).

**Performance Goals**:
- `deploy_page` responds in < 2 s for payloads up to 1 MB
- HTTP static server latency < 100 ms p95 for files < 5 MB
- Resident memory <= 200 MB under typical load

**Constraints**:
- MUST NOT occupy port 80 or 443 (owned by nginx)
- MCP on `127.0.0.1:4100`, static HTTP on `127.0.0.1:4000`
- PM2 `--max-memory-restart 200M`

**Scale/Scope**: MVP — single-operator, ~100 deployments per token, up to 10 tokens. No CDN, no multi-region.

---

## Constitution Check

*GATE: verified before Phase 0 research; re-verified now after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. 纯静态·服务器零执行 | PASS | HTTP server only reads files from sites/ and sends bytes; no script interpreters; user SVGs sanitized before serving |
| II. 防泄漏的不透明身份 | PASS | Token hash only in DB; space_id in URLs not token; did + space_id both random opaque; space_id rotatable |
| III. 上传内容一律不可信 | PASS | Path traversal checks, Zip Slip/bomb guards, extension allowlist, SVG sanitize, per-file/deployment/token quotas, atomic write (tmp to rename) |
| IV. 最小暴露面与进程隔离 | PASS | MCP 127.0.0.1:4100, HTTP 127.0.0.1:4000; both behind nginx; non-root PM2; code at /opt/pagefire, data at /var/pagefire |
| V. 不侵扰同机邻居 | PASS | Only appending nginx server blocks + PM2 process + acme.sh cert; no changes to Luminar; max-memory-restart 200M; no HSTS includeSubDomains |

**Constitution Check: ALL PASS**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-pagefire-mcp-publisher/
├── plan.md              (this file)
├── research.md          (Phase 0)
├── data-model.md        (Phase 1)
├── quickstart.md        (Phase 1)
├── contracts/
│   └── mcp-tools.md     (Phase 1)
├── checklists/
│   └── requirements.md
└── tasks.md             (Phase 2 - speckit-tasks output)
```

### Source Code (repository root)

```text
src/
├── index.ts              # Process entry: starts MCP server + HTTP server in parallel
├── config.ts             # Reads .env; exports typed Config object
├── auth.ts               # Token generation (pf_ prefix), SHA-256 hashing, Bearer verification
├── mcp/
│   ├── server.ts         # Streamable HTTP MCP server on 127.0.0.1:4100
│   └── tools/
│       ├── deploy-page.ts
│       ├── deploy-zip.ts
│       ├── deploy-files.ts
│       ├── list-deployments.ts
│       ├── get-deployment.ts
│       ├── pin-deployment.ts
│       ├── delete-deployment.ts
│       └── set-access.ts
├── http/
│   ├── server.ts         # HTTP server on 127.0.0.1:4000
│   ├── router.ts         # Parse Host header -> space_id lookup -> did lookup -> serve or 404
│   ├── serve.ts          # Send static file with Content-Type + security headers
│   └── headers.ts        # Security header constants
├── core/
│   ├── deploy.ts         # Orchestrates atomic publish: validate -> write tmp -> rename
│   ├── validate.ts       # Path traversal guard, extension allowlist, file size checks
│   ├── zip.ts            # ZIP extraction with Zip Slip + zip bomb protection
│   ├── svg.ts            # SVG sanitization via DOMPurify + jsdom
│   ├── quota.ts          # Per-file, per-deployment, per-token quota enforcement
│   └── ids.ts            # Crypto-random did + space_id generation with collision retry
├── db/
│   ├── migrate.ts        # Initialize schema + run migrations on startup
│   ├── repo.ts           # CRUD for tokens, deployments, audit_logs
│   └── schema.sql        # Canonical DDL
└── cli/
    └── index.ts          # pagefire token create|list|disable|rotate, gc

dist/                     # tsc output
test/
├── unit/
└── integration/

.env.example
package.json
tsconfig.json
vitest.config.ts
```

---

## Complexity Tracking

No constitution violations. No complexity justification required.
