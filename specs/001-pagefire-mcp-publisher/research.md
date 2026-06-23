# Research: PageFire MCP Publisher

**Date**: 2026-06-23
**Branch**: 001-pagefire-mcp-publisher
**Source**: docs/design.md (fully confirmed design), session context

All technical decisions are pre-confirmed; no NEEDS CLARIFICATION items remain.

---

## Decision Log

### D-001: MCP Transport — Streamable HTTP (not stdio)

- **Decision**: Use `@modelcontextprotocol/sdk` Streamable HTTP transport; bind MCP server to `127.0.0.1:4100`; expose via nginx at `mcp.pagefire.openhkting.com`.
- **Rationale**: The server is a remote Linux host; Claude/IDE clients are on a developer's local machine. stdio requires spawning a local subprocess — impossible across machines. SSE bound to 127.0.0.1 is also unreachable remotely. Streamable HTTP through nginx is the only viable path.
- **Alternatives considered**: stdio (rejected: remote server), SSE on 127.0.0.1 (rejected: not reachable from client), raw TCP (rejected: no TLS, no auth).

### D-002: Web Server — Reuse Existing nginx (not Caddy)

- **Decision**: PageFire's own HTTP layer binds to `127.0.0.1:4000` and handles subdomain routing. The existing nginx (docker, host-network) fronts it on 80/443.
- **Rationale**: The production server already runs Luminar with nginx occupying 80/443. Adding Caddy would cause a port conflict. The dynamic routing (subdomain → SQLite lookup → directory serve) cannot be done by a static nginx config alone anyway.
- **Alternatives considered**: Caddy replacing nginx (rejected: would break Luminar), nginx with Lua/njs (rejected: complexity without benefit), second port for PageFire (rejected: public ports limited to 80/443 by firewall).

### D-003: Wildcard TLS — acme.sh + Aliyun DNS-01

- **Decision**: Use `acme.sh` with the `dns_ali` plugin to issue `*.pagefire.openhkting.com` wildcard cert; install into `/opt/luminar/certbot/conf/pagefire/`; reload nginx with `docker restart luminar-nginx` on renewal.
- **Rationale**: Wildcard cert covers all deployment subdomains with one cert (no per-subdomain issuance). DNS-01 is the only ACME challenge type that works for wildcards. Aliyun hosts the DNS for `openhkting.com`.
- **Alternatives considered**: HTTP-01 (rejected: cannot issue wildcards), certbot with dns-aliyun plugin (viable but acme.sh has simpler Aliyun integration).

### D-004: Database — SQLite with WAL mode

- **Decision**: Use `better-sqlite3` with WAL journal mode for metadata storage.
- **Rationale**: No multi-host replication needed; single-server deployment; WAL allows concurrent readers from CLI/gc process alongside the main server process. `better-sqlite3` is synchronous, avoiding async complexity in hot paths.
- **Alternatives considered**: PostgreSQL (rejected: already runs for Luminar; adding a second PG instance costs memory on a 1.8GB server), Redis (rejected: overkill for metadata, adds another service).

### D-005: Process Manager — PM2 (reuse Luminar's)

- **Decision**: Run PageFire as a single PM2 process named `pagefire` with `--max-memory-restart 200M`.
- **Rationale**: Luminar already uses PM2 for `backend` and `storefront`. Reusing PM2 means no additional process supervisor, automatic restart on crash, shared `pm2 save`/`pm2 startup` persistence.
- **Alternatives considered**: systemd unit (viable but PM2 already installed and simpler), Docker container (adds memory overhead on a tight server).

### D-006: URL Scheme — `<did>--<space_id>.pagefire.openhkting.com`

- **Decision**: Each deployment gets a unique 6-character random `did`; each token maps to a 6–8 character opaque `space_id`. URL format: `<did>--<space_id>.pagefire.openhkting.com`.
- **Rationale**: Wildcard cert covers exactly one label level. Packing did and space_id into one label (separated by `--`) keeps all deployments within that one level. Absolute paths inside served HTML work correctly when deployments are at subdomain root (not a path prefix).
- **Alternatives considered**: Path prefix `/deploy/<did>/` (rejected: breaks absolute paths in HTML), True 4-level subdomains `<did>.<space_id>.pagefire...` (rejected: needs a second wildcard cert `*.<space_id>.pagefire...` per tenant).

### D-007: Atomic Writes — tmp-then-rename

- **Decision**: All file writes go to a staging directory `sites/<token_id>/.tmp/<did>-<rand>/`; full validation runs there; `os.rename()` atomically moves to `sites/<token_id>/<did>/` on success; staging is cleaned up on failure.
- **Rationale**: Without atomicity, a mid-write crash or validation failure could leave partial content accessible to visitors. `rename` is atomic on the same filesystem.
- **Alternatives considered**: Write in place with flag file (rejected: race condition window), two-phase commit (rejected: overkill for single-machine).

### D-008: Security Headers — No HSTS includeSubDomains

- **Decision**: Inject `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` on all served responses. Do NOT include `Strict-Transport-Security: includeSubDomains` or `preload`.
- **Rationale**: `openhkting.com` hosts Luminar at `jewelry.openhkting.com`. If PageFire's `*.pagefire.openhkting.com` responses set `includeSubDomains` HSTS, it would cascade to the parent domain and affect Luminar visitors. Plain HSTS (max-age only, no includeSubDomains) is safe.
- **Alternatives considered**: Full HSTS with includeSubDomains (rejected: impacts co-tenant Luminar).

### D-009: Single-Process Architecture

- **Decision**: One Node.js process hosts both the MCP server (port 4100) and the HTTP static server (port 4000), sharing a single `better-sqlite3` handle with WAL enabled.
- **Rationale**: Minimises memory footprint on the constrained server. WAL mode safely supports concurrent CLI reads from the same DB. Shared in-memory state (e.g., a request rate-limiter) is simpler in-process.
- **Alternatives considered**: Two separate processes (rejected: double memory, IPC complexity), three processes (MCP + HTTP + gc daemon; rejected: unnecessary for MVP).

### D-010: Content Type Allowlist

- **Decision**: Permit: `.html .htm .css .js .png .jpg .jpeg .gif .svg .webp .ico .woff2 .json .txt .md .map`. Reject everything else. SVG served as `image/svg+xml` only after sanitization; otherwise forced download header.
- **Rationale**: Restricting to known-safe static types eliminates the server-side execution attack surface entirely.

---

## Best Practices Confirmed

- **Zip Slip prevention**: Resolve each entry's target path; assert it starts with the canonical `destDir` prefix before extraction.
- **Zip bomb prevention**: Track cumulative uncompressed size; abort if > configured limit (default 200 MB); also cap entry count and individual entry size.
- **Token storage**: SHA-256 hash only; never log or return plain-text after initial creation.
- **did / space_id generation**: Use `crypto.randomBytes` (Node built-in); check DB uniqueness; retry up to 5 times on collision.
- **Rate limiting**: Track requests per token-per-minute in memory (Map + sliding window); respond 429 on excess.
- **Audit log**: Synchronous SQLite insert on each mutating MCP action (deploy/delete/pin/expire) before returning response.
