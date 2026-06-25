# Feature Specification: PageFire — MCP-Driven Static Site Publisher

**Feature Branch**: `001-pagefire-mcp-publisher`

**Created**: 2026-06-23

**Status**: Draft

**Input**: Self-hosted static publishing service callable via MCP; publishes HTML/ZIP to unique wildcard subdomains on an existing server shared with another production app.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Publish a Single HTML Page (Priority: P1)

A developer working inside Claude or any MCP-capable IDE calls a single tool with their HTML content. Within seconds they receive a public URL that anyone can open in a browser.

**Why this priority**: This is the atomic unit of value — the entire product exists to make this instant. Everything else builds on it.

**Independent Test**: Call `deploy_page` with minimal HTML; verify the returned URL serves that HTML over HTTPS within 5 seconds. No other feature needed.

**Acceptance Scenarios**:

1. **Given** a valid token and a single HTML string, **When** `deploy_page` is called, **Then** a unique HTTPS URL is returned and the page is immediately publicly accessible.
2. **Given** no `ttl_days` argument, **When** `deploy_page` is called, **Then** the deployment expires in 7 days by default.
3. **Given** an invalid or missing token, **When** any tool is called, **Then** a clear authorization error is returned and no content is written.
4. **Given** an HTML file larger than the per-file size limit, **When** `deploy_page` is called, **Then** an error is returned describing the limit exceeded.

---

### User Story 2 — Publish a Multi-File ZIP Package (Priority: P2)

A developer generates a multi-page site (HTML + CSS + images) as a ZIP archive and publishes it in one call. Internal links and absolute asset paths (`/css/style.css`) work correctly in the browser.

**Why this priority**: Real frontend output is almost always multi-file. Single-page publishing alone would cover only toy cases.

**Independent Test**: Call `deploy_zip` with a ZIP containing `index.html` and a CSS file referenced with an absolute path; verify both load correctly from the returned URL.

**Acceptance Scenarios**:

1. **Given** a valid ZIP archive with `index.html` at root, **When** `deploy_zip` is called, **Then** the returned URL serves the full package with all assets intact.
2. **Given** a ZIP whose total uncompressed size exceeds the deployment quota, **When** `deploy_zip` is called, **Then** the upload is rejected before any content is written.
3. **Given** a ZIP containing a path that would escape the deployment directory (Zip Slip), **When** `deploy_zip` is called, **Then** the upload is rejected with a security error.
4. **Given** a ZIP with an executable file extension (`.php`, `.sh`), **When** `deploy_zip` is called, **Then** that file is rejected and the upload fails.

---

### User Story 3 — Manage Deployments Lifecycle (Priority: P2)

A developer lists their active deployments, pins one to make it permanent, and deletes one that is no longer needed — all via MCP tools.

**Why this priority**: Without lifecycle management, users lose track of what they published and the server fills with stale content.

**Independent Test**: Publish a page, call `list_deployments`, verify it appears; call `pin_deployment`, verify it no longer shows an expiry; call `delete_deployment`, verify the URL returns 404.

**Acceptance Scenarios**:

1. **Given** a token with multiple deployments, **When** `list_deployments` is called, **Then** all active deployments with their URLs, titles, and expiry dates are returned.
2. **Given** a temporary deployment, **When** `pin_deployment` is called, **Then** the deployment never expires and the response confirms permanent status.
3. **Given** any existing deployment, **When** `delete_deployment` is called, **Then** the URL returns 404 immediately and all stored files are removed.

---

### User Story 4 — Password-Protect a Deployment (Priority: P3)

A developer marks a deployment as password-protected so only people with the correct passphrase can view it.

**Why this priority**: Desirable for sharing drafts that shouldn't be fully public, but not blocking for MVP.

**Independent Test**: Publish with `access: "password"` and a passphrase; verify the URL prompts for the passphrase and denies access without it.

**Acceptance Scenarios**:

1. **Given** a deployment with `access: "password"` set, **When** a visitor accesses the URL without the passphrase, **Then** they receive an authentication challenge (401).
2. **Given** the correct passphrase is supplied, **When** a visitor accesses the URL, **Then** the page loads normally.
3. **Given** `set_access` is called to remove password protection, **When** a visitor accesses the URL, **Then** it loads without any challenge.

---

### User Story 5 — Operator Token Management (Priority: P1)

An operator (server owner) creates, lists, and revokes tokens via a CLI tool on the server. Tokens are never stored in plain text; a leaked token can be disabled without affecting other tenants.

**Why this priority**: No tokens = no access for any user. This must exist before any MCP call can succeed.

**Independent Test**: Run `pagefire token create`, verify a `pf_` prefixed token is printed once; run `pagefire token list`, verify the new entry appears without revealing the secret; run `pagefire token disable`, verify subsequent MCP calls with that token are rejected.

**Acceptance Scenarios**:

1. **Given** the CLI `token create` command is run, **Then** a one-time plain-text `pf_…` token is printed and the hashed version is stored; subsequent `token list` never reveals the plain text.
2. **Given** a `space_id` is suspected leaked, **When** `token rotate` is called, **Then** all existing deployment URLs under that space become unreachable and new deployments use the new `space_id`.
3. **Given** a token is disabled, **When** any MCP tool call is made with it, **Then** a 401 error is returned immediately.

---

### Edge Cases

- What happens when a deployment's `did` or `space_id` collides with an existing one on generation? → Retry up to N times; if still colliding, return an internal error.
- What happens when the server disk quota is exhausted? → Reject new deployments with a quota-exceeded error; do not silently fail.
- What happens when a ZIP contains only deeply nested files and no root `index.html`? → Reject with a clear error explaining the entry-point requirement.
- What happens when an expired deployment is accessed? → Return a minimal 404 page with no information about the former content.
- What happens if the `gc` cleanup job is interrupted mid-run? → Partial cleanups are safe because each deployment directory is independent.
- What happens when `DEPLOYMENT.md` references the Luminar SSH key? → Key is excluded via `.gitignore`; the operator keeps it locally and securely.

---

## Requirements *(mandatory)*

### Functional Requirements

**Publish tools (MCP)**
- **FR-001**: System MUST expose a `deploy_page` tool that accepts an HTML string and returns a unique public HTTPS URL.
- **FR-002**: System MUST expose a `deploy_zip` tool that accepts a base64-encoded ZIP archive and serves the unpacked contents at a unique subdomain root.
- **FR-003**: System MUST expose a `deploy_files` tool that accepts an explicit list of named file contents and publishes them as a multi-file deployment.
- **FR-004**: All MCP tools MUST require a Bearer token on every request; requests without a valid token MUST be rejected with a 401 response.
- **FR-005**: Every successful publish MUST return the full public HTTPS URL of the deployment.

**Deployment lifecycle (MCP)**
- **FR-006**: System MUST expose `list_deployments`, `get_deployment`, `pin_deployment`, `delete_deployment`, and `set_access` tools.
- **FR-007**: Deployments without explicit `pin: true` MUST expire after a configurable TTL (default 7 days).
- **FR-008**: Deleting a deployment MUST remove all stored files and return 404 on the URL immediately.

**Content safety**
- **FR-009**: System MUST reject uploads containing file-path traversal sequences (`..`, absolute paths, symlinks).
- **FR-010**: System MUST reject ZIP archives that contain entries whose extracted paths would escape the deployment root (Zip Slip).
- **FR-011**: System MUST enforce configurable per-file, per-deployment, and per-token quota limits; exceeding any limit MUST result in a rejected upload.
- **FR-012**: System MUST reject files with extensions outside an allowlist (`.html .htm .css .js .png .jpg .jpeg .gif .svg .webp .ico .woff2 .json .txt .md .map`).
- **FR-013**: SVG files MUST be sanitized (inline `<script>` and event attributes removed) before being served; unsanitized SVGs MUST be served with a download-forcing content-disposition header instead.

**Static serving**
- **FR-014**: Each deployment MUST be served at a unique third-level subdomain in the format `<did>--<space_id>.pagefire.openhkting.com`.
- **FR-015**: The serving layer MUST inject security response headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`) on every response.
- **FR-016**: Non-existent or expired deployments MUST return a generic 404 page that reveals no information about former content.
- **FR-017**: Password-protected deployments MUST challenge unauthenticated visitors with a 401 and serve content only after correct passphrase verification.

**Token & identity**
- **FR-018**: Token secrets MUST be stored only as cryptographic hashes; the plain-text value MUST be displayed exactly once at creation time.
- **FR-019**: Each token MUST be mapped to an opaque, randomly generated `space_id` that appears in deployment URLs; the `space_id` MUST be rotatable without changing the token secret.
- **FR-020**: The CLI `pagefire gc` command MUST delete all files and metadata for deployments past their expiry date.

**Operator CLI**
- **FR-021**: CLI MUST support `token create`, `token list`, `token disable`, `token rotate`, and `gc` subcommands.

### Key Entities

- **Token**: A `pf_`-prefixed secret credential; stored as a hash; maps to exactly one `space_id` at a time; has status (active/disabled) and quotas.
- **Space**: The opaque identity of a token in the public URL namespace, represented by a short random `space_id`; can be rotated independently of the token secret.
- **Deployment**: A single publish event; has a unique `did` (short random ID), belongs to a Space, maps to a directory of static files, has lifecycle metadata (TTL, pinned, access mode, passphrase hash).
- **Audit Log Entry**: An immutable record of each deploy/delete/pin/expire action with timestamp, token identity (not secret), deployment ID, file count, size, and client IP.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from calling `deploy_page` to sharing a working public URL in under 5 seconds on a standard broadband connection.
- **SC-002**: A ZIP package of up to 50 MB can be uploaded, validated, and publicly accessible within 30 seconds.
- **SC-003**: 100% of MCP requests without a valid token are rejected before any file I/O occurs.
- **SC-004**: Expired deployments are removed within 24 hours of their expiry time by the automated cleanup job.
- **SC-005**: No user-uploaded file content is executed on the server; verified by the absence of any server-side script interpreter invocation in the serving path.
- **SC-006**: Rotating a `space_id` makes all URLs under the old `space_id` return 404 within 1 second of the rotation command completing.
- **SC-007**: The service operates within 200 MB resident memory under typical load (≤ 10 concurrent publish requests), preserving headroom on the shared 400 MB available.

---

## Assumptions

- The server is an existing Alibaba Cloud Linux 8 instance (`<your-server-ip>`) already running the Luminar production application with nginx (docker, host network) occupying ports 80 and 443.
- PageFire shares that nginx as its sole public entry point; no second web server process will be introduced.
- TLS for `*.pagefire.openhkting.com` is provisioned via acme.sh using Aliyun DNS-01 challenge; the wildcard A-record `*.pagefire → <your-server-ip>` is added by the operator in the Aliyun console.
- MCP clients (Claude Desktop, Cursor, etc.) connect remotely over HTTPS to `mcp.pagefire.openhkting.com`; stdio transport is not used.
- Operator token provisioning is manual (CLI on the server); self-service registration is out of scope for MVP.
- All deployments are single-tenant from the user's perspective (one token per MCP client config); multi-tenant isolation is enforced server-side.
- Content moderation and DMCA takedown are out of scope for MVP.
- The ZIP entry point must be `index.html` at the archive root; other entry-point configurations are out of scope.
