# Tasks: PageFire — MCP-Driven Static Site Publisher

**Input**: Design documents from `specs/001-pagefire-mcp-publisher/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-tools.md, quickstart.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no inter-task dependency)
- **[Story]**: Which user story this belongs to (US1–US5)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize the TypeScript project, directory layout, tooling, and environment scaffolding.

- [X] T001 Initialize Node.js project: create `package.json` with `pnpm`, add TypeScript 5.x, `tsconfig.json` targeting Node 20, `vitest.config.ts`, `.env.example`
- [X] T002 [P] Create directory skeleton: `src/mcp/tools/`, `src/http/`, `src/core/`, `src/db/`, `src/cli/`, `test/unit/`, `test/integration/`
- [X] T003 [P] Add production dependencies to `package.json`: `@modelcontextprotocol/sdk`, `better-sqlite3`, `@types/better-sqlite3`, `yauzl`, `@types/yauzl`, `dompurify`, `jsdom`, `@types/jsdom`
- [X] T004 [P] Add dev dependencies: `vitest`, `@types/node`, `typescript`, `tsx`
- [X] T005 [P] Write `.gitignore` additions for `dist/`, `node_modules/`, `dev-data/`, `.env`
- [X] T006 Add `pnpm` scripts to `package.json`: `build` (tsc), `start` (node dist/index.js), `test` (vitest run), `test:unit`, `test:integration`, `dev` (tsx watch src/index.ts)

**Checkpoint**: `pnpm install` succeeds; `pnpm build` compiles an empty `src/index.ts` without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by ALL user stories. Must be complete before any story work begins.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Implement `src/config.ts`: read and validate env vars (`PAGEFIRE_DB`, `PAGEFIRE_SITES`, `PAGEFIRE_HTTP_HOST`, `PAGEFIRE_HTTP_PORT`, `PAGEFIRE_MCP_PORT`, `PAGEFIRE_BASE_DOMAIN`); export typed `Config` singleton
- [x] T008 [P] Write `src/db/schema.sql`: canonical DDL from data-model.md (tokens, deployments, deploy_logs tables + indexes; `PRAGMA journal_mode=WAL`)
- [x] T009 Implement `src/db/migrate.ts`: open SQLite with WAL, read and execute `schema.sql`, handle idempotent re-runs; export `openDb(config): Database`
- [X] T010 [P] Implement `src/db/repo.ts`: typed repository functions — `createToken`, `getTokenByHash`, `getTokenBySpaceId`, `disableToken`, `rotateSpaceId`, `createDeployment`, `getDeploymentByDid`, `listDeployments`, `updateDeployment`, `deleteDeployment`, `insertAuditLog`, `listExpiredDeployments`
- [X] T011 [P] Implement `src/auth.ts`: `generateTokenSecret()` → `pf_<32-char-random>`, `hashToken(plain)` → SHA-256 hex, `verifyBearer(header, db)` → token row or null
- [x] T012 [P] Implement `src/core/ids.ts`: `generateDid()` and `generateSpaceId()` using `crypto.randomBytes`; both check DB uniqueness with up to 5 retries; throw on exhaustion
- [x] T013 [P] Implement `src/http/headers.ts`: export `SECURITY_HEADERS` constant object — CSP (default-src 'self', script-src 'self' 'unsafe-inline', style-src 'self' 'unsafe-inline'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [X] T014 [P] Implement `src/core/validate.ts`: `validatePath(p)` — reject `..`, absolute paths, symlinks; `ALLOWED_EXTENSIONS` set; `validateExtension(filename)`; `validateFileSize(bytes, limit)`
- [X] T015 Implement `src/index.ts` process entry: import `openDb`, `startMcpServer`, `startHttpServer`; start both in parallel; handle SIGTERM/SIGINT gracefully

**Checkpoint**: `pnpm build` succeeds with no type errors; `node dist/index.js` starts without crashing (both servers bind their ports).

---

## Phase 3: User Story 1 — Publish a Single HTML Page (Priority: P1) MVP

**Goal**: Call `deploy_page` → receive a working public HTTPS URL serving the HTML.

**Independent Test**: `curl -X POST http://127.0.0.1:4100/mcp -H "Authorization: Bearer pf_xxx" -d '{"method":"tools/call","params":{"name":"deploy_page","arguments":{"html":"<h1>Hi</h1>"}}}' | jq .result.url` → URL exists; `curl <url>` → 200 with `<h1>Hi</h1>`.

### Implementation

- [x] T016 [US1] Implement `src/core/deploy.ts`: `deployFiles(tokenId, did, files[])` — write to `.tmp/<did>-<rand>/`, validate each file (path, extension, size), rename to `sites/<tokenId>/<did>/`, clean up on failure; export also `deleteDeploymentFiles(tokenId, did)`
- [x] T017 [US1] Implement `src/core/quota.ts`: `checkQuota(db, tokenId, newBytes)` — query sum of existing deployment bytes + file_count for token; throw `QUOTA_EXCEEDED` if exceeded
- [x] T018 [US1] Implement `src/mcp/tools/deploy-page.ts`: accept `{ html, title?, access?, password?, ttl_days?, pin? }`; call `verifyBearer`; generate `did`; call `checkQuota`; call `deployFiles` with single `index.html`; insert deployment row; insert audit log; return `{ url, did, expires_at, pinned }`
- [x] T019 [US1] Implement `src/mcp/server.ts`: create Streamable HTTP MCP server on `127.0.0.1:4100`; register `deploy_page` tool with input schema; extract `Authorization` header on each request and call `verifyBearer`; return 401 JSON on auth failure
- [x] T020 [US1] Implement `src/http/serve.ts`: `serveFile(req, res, filePath, headers)` — read file, detect MIME from extension, apply security headers, send; handle MIME for all allowed extensions; send download header for unrecognized
- [x] T021 [US1] Implement `src/http/router.ts`: parse `Host` header → extract `<did>--<space_id>` or `<space_id>`; call `getTokenBySpaceId` → if not found 404; call `getDeploymentByDid` → if not found or expired 404; resolve file path; call `serveFile`; handle `/healthz` → `200 ok`
- [x] T022 [US1] Implement `src/http/server.ts`: start `http.createServer` on `127.0.0.1:4000`; pass all requests to `router`

**Checkpoint (US1 complete)**: `deploy_page` returns a URL; the URL serves the HTML with security headers; invalid token returns 401; oversized HTML returns `FILE_TOO_LARGE`; unknown subdomain returns 404.

---

## Phase 4: User Story 2 — Publish a Multi-File ZIP Package (Priority: P2)

**Goal**: Call `deploy_zip` with a base64 ZIP → all assets served correctly from the returned URL.

**Independent Test**: Encode a ZIP of `index.html` + `style.css` (referenced as `/style.css`), call `deploy_zip`, open the URL in a browser → page loads with correct styles.

### Implementation

- [x] T023 [US2] Implement `src/core/zip.ts`: `extractZip(base64, destDir)` using `yauzl`; for each entry: check Zip Slip (canonical path must be inside destDir), validate extension, accumulate uncompressed size (abort > 200 MB), accumulate file count (abort > 500), check compression ratio (abort > 100:1); require `index.html` at root; extract to `destDir`
- [x] T024 [US2] Implement `src/mcp/tools/deploy-zip.ts`: accept `{ zip_base64, title?, access?, password?, ttl_days?, pin? }`; call `verifyBearer`; generate `did`; call `checkQuota` (estimated); call `extractZip` into tmp dir; call quota check on actual size; rename to live dir; insert deployment + audit log; return URL response
- [x] T025 [US2] Register `deploy_zip` tool in `src/mcp/server.ts`
- [x] T026 [US2] Implement `src/mcp/tools/deploy-files.ts`: accept `{ files: [{path, content, encoding?}], title?, access?, password?, ttl_days?, pin? }`; validate each path/extension; call `checkQuota`; call `deployFiles`; insert deployment + audit log; return URL response
- [x] T027 [US2] Register `deploy_files` tool in `src/mcp/server.ts`

**Checkpoint (US2 complete)**: ZIP deploys successfully; Zip Slip entry rejected; zip bomb rejected; missing `index.html` rejected; forbidden extension rejected.

---

## Phase 5: User Story 3 — Manage Deployment Lifecycle (Priority: P2)

**Goal**: List, pin, and delete deployments via MCP tools.

**Independent Test**: Deploy a page → `list_deployments` shows it → `pin_deployment` → `list_deployments` shows no expiry → `delete_deployment` → URL returns 404.

### Implementation

- [x] T028 [P] [US3] Implement `src/mcp/tools/list-deployments.ts`: call `verifyBearer`; call `listDeployments(db, tokenId, includeExpired)`; return array of deployment summaries
- [x] T029 [P] [US3] Implement `src/mcp/tools/get-deployment.ts`: call `verifyBearer`; call `getDeploymentByDid`; return full detail including `domain`
- [x] T030 [P] [US3] Implement `src/mcp/tools/pin-deployment.ts`: call `verifyBearer`; set `pinned=1`, `expires_at=null`; insert audit log; return confirmation
- [x] T031 [P] [US3] Implement `src/mcp/tools/delete-deployment.ts`: call `verifyBearer`; call `deleteDeploymentFiles(tokenId, did)`; delete DB row; insert audit log; return `{ deleted: true }`
- [x] T032 [US3] Register `list_deployments`, `get_deployment`, `pin_deployment`, `delete_deployment` tools in `src/mcp/server.ts`

**Checkpoint (US3 complete)**: All four lifecycle tools work; deleted deployment URL returns 404 immediately; pinned deployment has no expiry in listing.

---

## Phase 6: User Story 4 — Password-Protect a Deployment (Priority: P3)

**Goal**: Mark a deployment with `access: "password"` → 401 without passphrase; page loads with correct passphrase.

**Independent Test**: Deploy with `access: "password", password: "secret"`; `curl <url>` → 401; `curl -H "X-Passphrase: secret" <url>` → 200.

### Implementation

- [X] T033 [US4] Implement passphrase check in `src/http/router.ts`: if deployment `access='password'`, extract `X-Passphrase` header (or query param `?p=`), hash it, compare to `pass_hash`; respond 401 with minimal HTML form if mismatch
- [x] T034 [US4] Implement `src/mcp/tools/set-access.ts`: call `verifyBearer`; update `access` and `pass_hash` on deployment; insert audit log; return confirmation
- [x] T035 [US4] Register `set_access` tool in `src/mcp/server.ts`
- [x] T036 [US4] Update `deploy_page`, `deploy_zip`, `deploy_files` tools to store `pass_hash` when `access='password'` is supplied

**Checkpoint (US4 complete)**: Password-protected URL returns 401 without passphrase; correct passphrase grants access; `set_access` can enable/disable protection on existing deployments.

---

## Phase 7: User Story 5 — Operator Token Management CLI (Priority: P1)

**Goal**: `pagefire token create` issues a usable token; `token list`, `disable`, `rotate` work; expired deployments cleaned by `gc`.

**Independent Test**: Create token → use it in a `deploy_page` call → succeeds; disable token → `deploy_page` returns 401; `gc` after TTL → deployment URL returns 404.

### Implementation

- [x] T037 [US5] Implement `src/cli/index.ts` entry with subcommands using `process.argv` parsing (no heavy CLI framework):
  - `token create --slug <s> [--label <l>]`: generate `space_id`, generate token secret, hash it, insert row, print one-time plain text
  - `token list`: query all tokens, print slug/space_id/status/quota (never print secret)
  - `token disable --slug <s>`: set `status='disabled'`
  - `token rotate --slug <s>`: generate new `space_id`, update row; print new `space_id`
  - `gc`: query expired deployments (`expires_at <= now`, `pinned=0`); delete files; delete rows; print count
- [x] T038 [US5] Add `pagefire` bin entry to `package.json` pointing to `dist/cli/index.js`

**Checkpoint (US5 complete)**: Full CLI workflow works end-to-end; `gc` removes expired files.

---

## Phase 8: SVG Sanitization (Security, cross-cutting)

**Purpose**: Ensure SVG files cannot carry inline scripts to visitors.

- [x] T039 Implement `src/core/svg.ts`: `sanitizeSvg(content: string): string | null` — parse with `jsdom`, run `DOMPurify.sanitize` with `FORCE_BODY: false`; return sanitized string or null if unparseable
- [x] T040 Update `src/http/serve.ts`: for `.svg` files, read content, call `sanitizeSvg`; if null → serve with `Content-Disposition: attachment`; otherwise serve sanitized content as `image/svg+xml`
- [X] T041 [POST-MVP] Update `src/core/deploy.ts`: sanitize `.svg` files at write time (store sanitized version); update `size_bytes` accordingly — deferred to post-MVP

**Checkpoint**: SVG with `<script>` tag → either sanitized on serve or forced download; clean SVG → served normally.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Rate limiting, error messages, integration hardening, documentation.

- [X] T042 [P] Implement in-memory rate limiter in `src/mcp/server.ts`: sliding-window per token, configurable `PAGEFIRE_RATE_LIMIT` (default 30 req/min); respond 429 on excess
- [X] T043 [P] Add generic 404 page in `src/http/router.ts`: minimal HTML with no information about former content; same response shape for unknown subdomain, expired, and deleted cases
- [X] T044 [P] Write unit tests in `test/unit/validate.test.ts`: path traversal cases, extension allowlist, file size limits
- [X] T045 [P] Write unit tests in `test/unit/ids.test.ts`: collision retry logic, format correctness
- [x] T046 [P] Write unit tests in `test/unit/auth.test.ts`: token hashing, bearer verification
- [X] T047 [P] Write unit tests in `test/unit/zip.test.ts`: Zip Slip detection, zip bomb detection, missing index.html
- [X] T048 Write integration test in `test/integration/deploy-page.test.ts`: start in-process server → deploy → serve → delete → 404
- [X] T049 Write integration test in `test/integration/deploy-zip.test.ts`: ZIP deploy → multi-file serve → asset paths correct
- [x] T050 [P] Update `CLAUDE.md` with build/test/start commands and CLI reference (from plan.md §Build & Run)
- [X] T051 [P] Add `dist/` to `.gitignore`; add `pnpm-lock.yaml` to committed files
- [ ] T052 Run `quickstart.md` validation: follow all steps, confirm health check returns `ok`, deploy a test page, verify URL accessible

**Checkpoint**: All tests pass (`pnpm test`); `pnpm build` clean; quickstart works end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 - deploy_page)**: Depends on Phase 2 — **MVP deliverable**
- **Phase 4 (US2 - deploy_zip)**: Depends on Phase 2 + Phase 3 complete (reuses `deployFiles`)
- **Phase 5 (US3 - lifecycle)**: Depends on Phase 2 + Phase 3 (needs existing deployments)
- **Phase 6 (US4 - password)**: Depends on Phase 3 (extends deploy tools + router)
- **Phase 7 (US5 - CLI)**: Depends on Phase 2 only — can be done in parallel with Phase 3
- **Phase 8 (SVG)**: Depends on Phase 3 (extends serve.ts + deploy.ts)
- **Phase 9 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Foundational only — no story deps
- **US2 (P2)**: Foundational only — no story deps
- **US3 (P2)**: US1 must be complete (needs deployed content to manage)
- **US4 (P3)**: US1 must be complete (extends deploy tools)
- **US5 (P1)**: Foundational only — can run in parallel with US1

### Parallel Opportunities

Within Phase 2, these can run in parallel: T008, T010, T011, T012, T013, T014

Within Phase 3, sequential order: T016 → T017 → T018 → T019 (MCP server) in parallel with T020 → T021 → T022 (HTTP server)

Within Phase 5, T028/T029/T030/T031 are all independent (different files) — run in parallel.

Phase 7 (US5 CLI) can start as soon as Phase 2 is done, running alongside Phase 3.

---

## Parallel Example: Phase 2 Foundational

```
# These can all start at the same time after Phase 1:
T008: src/db/schema.sql
T010: src/db/repo.ts
T011: src/auth.ts
T012: src/core/ids.ts
T013: src/http/headers.ts
T014: src/core/validate.ts
```

## Parallel Example: Phase 9 Polish

```
# All test files are independent — dispatch together:
T044: test/unit/validate.test.ts
T045: test/unit/ids.test.ts
T046: test/unit/auth.test.ts
T047: test/unit/zip.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 = single page publish)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 — `deploy_page` + HTTP serve
4. **STOP and VALIDATE**: call `deploy_page`, open URL in browser — it works
5. Ship minimal version to server for real-world smoke test

### Incremental Delivery

1. Phase 1+2 → foundation ready
2. Phase 3 (US1) → MVP: publish a page
3. Phase 4 (US2) → publish a ZIP site
4. Phase 5 (US3) → lifecycle management
5. Phase 7 (US5) → full operator CLI + gc
6. Phase 6 (US4) → password protection
7. Phase 8 → SVG security
8. Phase 9 → tests + polish

### Multi-Agent Parallel Strategy

With multi-agent execution (user requested):

- **After Phase 2**: Agents can tackle US1, US2 (partially), and US5 in parallel
  - Agent A: Phase 3 (T016–T022) — core deploy + serve
  - Agent B: Phase 4 (T023–T027) — ZIP support
  - Agent C: Phase 7 (T037–T038) — CLI
- **After Phase 3**: Agent D can start Phase 5 (lifecycle tools) and Phase 6 (password)
- **Phase 8+9**: Can be dispatched as parallel cleanup agents

---

## Notes

- No test framework beyond vitest — no Mocha, Jest, or test runners that need global install
- No CLI framework dependency — use `process.argv` parsing to keep the binary lightweight
- SQLite WAL mode is set in `schema.sql` via `PRAGMA`; `migrate.ts` must run it before any other statement
- Token secrets are printed once at `token create` time; the CLI must NOT log them to any file
- `pnpm` is the package manager (not npm or yarn) — matches Luminar convention on this server
