# MCP Tool Contracts

**Transport**: Streamable HTTP
**Base URL**: `https://mcp.pagefire.openhkting.com/mcp`
**Auth**: `Authorization: Bearer pf_<token>` on every request

All tools return a JSON object. On error, they return `{ "error": "<message>", "code": "<ERROR_CODE>" }`.

---

## deploy_page

Publish a single HTML page. Returns a unique public HTTPS URL.

### Input

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `html` | string | ✅ | — | Raw HTML content; max 10 MB |
| `title` | string | ❌ | `null` | Optional display label |
| `access` | `"public"` \| `"password"` | ❌ | `"public"` | |
| `password` | string | ❌ | `null` | Required when `access="password"` |
| `ttl_days` | integer | ❌ | `7` | Days until expiry; ignored when `pin=true` |
| `pin` | boolean | ❌ | `false` | `true` = never expires |

### Output (success)

```json
{
  "url": "https://k3p9xa--v8x2qd.pagefire.openhkting.com/",
  "did": "k3p9xa",
  "expires_at": "2026-06-30T00:00:00Z",
  "pinned": false
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Token missing or invalid |
| `QUOTA_EXCEEDED` | Per-token deployment or byte quota hit |
| `FILE_TOO_LARGE` | HTML exceeds 10 MB limit |
| `INVALID_CONTENT` | HTML failed sanitization |

---

## deploy_zip

Publish a multi-file site from a ZIP archive.

### Input

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `zip_base64` | string | ✅ | — | Base64-encoded ZIP; max 50 MB uncompressed |
| `title` | string | ❌ | `null` | |
| `access` | `"public"` \| `"password"` | ❌ | `"public"` | |
| `password` | string | ❌ | `null` | |
| `ttl_days` | integer | ❌ | `7` | |
| `pin` | boolean | ❌ | `false` | |

### Output (success)

```json
{
  "url": "https://t5h2kq--v8x2qd.pagefire.openhkting.com/",
  "did": "t5h2kq",
  "file_count": 12,
  "size_bytes": 204800,
  "expires_at": "2026-06-30T00:00:00Z",
  "pinned": false
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Token missing or invalid |
| `QUOTA_EXCEEDED` | Quota hit |
| `ZIP_TOO_LARGE` | Uncompressed size > 50 MB |
| `ZIP_SLIP` | Entry path escapes deployment root |
| `ZIP_BOMB` | Compression ratio exceeds safety threshold |
| `MISSING_INDEX` | No `index.html` at archive root |
| `FORBIDDEN_EXTENSION` | Entry has disallowed file extension |
| `FILE_COUNT_EXCEEDED` | More than 500 files |

---

## deploy_files

Publish multiple files as an explicit list.

### Input

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `files` | array | ✅ | — | Array of `{ path: string, content: string, encoding?: "utf8" \| "base64" }` |
| `title` | string | ❌ | `null` | |
| `access` | `"public"` \| `"password"` | ❌ | `"public"` | |
| `password` | string | ❌ | `null` | |
| `ttl_days` | integer | ❌ | `7` | |
| `pin` | boolean | ❌ | `false` | |

`path` must start with a filename (no leading `/` or `..`). `encoding` defaults to `utf8`.

### Output (success)

Same shape as `deploy_zip`.

---

## list_deployments

List all deployments belonging to the authenticated token.

### Input

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `include_expired` | boolean | ❌ | `false` |

### Output

```json
{
  "deployments": [
    {
      "did": "k3p9xa",
      "url": "https://k3p9xa--v8x2qd.pagefire.openhkting.com/",
      "title": "My landing page",
      "access": "public",
      "pinned": false,
      "expires_at": "2026-06-30T00:00:00Z",
      "size_bytes": 4096,
      "file_count": 1,
      "created_at": "2026-06-23T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

## get_deployment

Retrieve full details of a single deployment.

### Input

| Parameter | Type | Required |
|-----------|------|----------|
| `did` | string | ✅ |

### Output

Same shape as one item in `list_deployments`, plus:
```json
{ "domain": "k3p9xa--v8x2qd.pagefire.openhkting.com" }
```

### Error Codes

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | No deployment with this `did` for this token |

---

## pin_deployment

Mark a deployment as permanent (never expires).

### Input

| Parameter | Type | Required |
|-----------|------|----------|
| `did` | string | ✅ |

### Output

```json
{ "did": "k3p9xa", "pinned": true, "expires_at": null }
```

---

## delete_deployment

Immediately delete a deployment and all its files.

### Input

| Parameter | Type | Required |
|-----------|------|----------|
| `did` | string | ✅ |

### Output

```json
{ "did": "k3p9xa", "deleted": true }
```

---

## set_access

Change the access mode of a deployment.

### Input

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `did` | string | ✅ | |
| `access` | `"public"` \| `"password"` | ✅ | |
| `password` | string | ❌ | Required when `access="password"` |

### Output

```json
{ "did": "k3p9xa", "access": "password" }
```

---

## deploy_markdown

Render a single Markdown string into a styled HTML page and publish it.

### Input

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `markdown` | string | ✅ | — | Raw Markdown content; max 5 MB |
| `title` | string | ❌ | first `# heading` or `"Document"` | Display title |
| `theme` | `"light"` \| `"dark"` \| `"sepia"` | ❌ | `"light"` | Visual theme |
| `did` | string | ❌ | random | Custom deployment ID (update in-place) |
| `access` | `"public"` \| `"password"` | ❌ | `"public"` | |
| `password` | string | ❌ | `null` | Required when `access="password"` |
| `ttl_days` | integer | ❌ | `7` | Days until expiry; ignored when `pin=true` |
| `pin` | boolean | ❌ | `false` | `true` = never expires |

### Output (success)

```json
{
  "url": "https://k3p9xa--v8x2qd.pagefire.openhkting.com/",
  "did": "k3p9xa",
  "expires_at": "2026-07-02T00:00:00Z",
  "pinned": false
}
```

### Rendering notes

- Frontmatter (`---`/`+++` blocks) is stripped before rendering.
- GitHub-Flavored Markdown (tables, task lists, strikethrough) is supported.
- A **right-side TOC** (page outline panel) is auto-generated from `##` and `###` headings
  and shown on screens wider than 1100 px. Active heading is highlighted via
  `IntersectionObserver`.

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Token missing or invalid |
| `QUOTA_EXCEEDED` | Per-token quota hit |
| `FILE_TOO_LARGE` | Markdown exceeds 5 MB limit |
| `INVALID_CONTENT` | `markdown` field missing or not a string |

---

## deploy_docs

Render multiple Markdown files into a multi-page documentation site with a **left navigation
sidebar** (file links) and a **right TOC panel** (current-page headings). No `index.md`
required — the entry point is resolved automatically.

### Input

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `files` | array | ✅ | — | Array of `{ path: string, markdown: string }` |
| `files[].path` | string | ✅ | — | Relative path ending in `.md`, e.g. `guide.md`, `api/ref.md` |
| `files[].markdown` | string | ✅ | — | Raw Markdown content for this page |
| `title` | string | ❌ | `"Documentation"` | Site title shown in the sidebar header |
| `theme` | `"light"` \| `"dark"` \| `"sepia"` | ❌ | `"light"` | Visual theme |
| `did` | string | ❌ | random | Custom deployment ID (update in-place) |
| `access` | `"public"` \| `"password"` | ❌ | `"public"` | |
| `password` | string | ❌ | `null` | Required when `access="password"` |
| `ttl_days` | integer | ❌ | `7` | |
| `pin` | boolean | ❌ | `false` | |

**Limits:** max 200 pages; total Markdown ≤ 10 MB.

### Entry point resolution (no `index.md` required)

The root URL (`/`) always serves `index.html`. The entry page is determined as:

1. A file whose `path` is `index.md` → rendered as `index.html`
2. A file whose `path` is `README.md` → rendered as `readme.html`; a redirect
   `index.html → /readme.html` is generated
3. The **first file** in the `files` array → its `.html` output is the entry;
   a redirect `index.html` is generated

### Output (success)

```json
{
  "url": "https://d9uz2d--v8x2qd.pagefire.openhkting.com/",
  "did": "d9uz2d",
  "file_count": 5,
  "size_bytes": 48210,
  "expires_at": null,
  "pinned": true
}
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [Left sidebar 268px] │   Article content   │ [TOC]  │
│  Site title          │   max-width 780px   │ right  │
│  ─ page1.md  ←active │                     │ ## H2  │
│  ─ page2.md          │   # Page Title      │ ## H2  │
│  ─ page3.md          │   ...               │  ### H3│
│                      │                     │        │
└─────────────────────────────────────────────────────┘
```

- Left sidebar: fixed, shows all pages; active page highlighted in accent color.
- Right TOC: fixed, shows `##` / `###` headings of the current page; visible on screens
  ≥ 1280 px; active heading highlighted via `IntersectionObserver`.
- Mobile (< 860 px): left sidebar collapses behind a `☰` button; right TOC hidden.

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Token missing or invalid |
| `QUOTA_EXCEEDED` | Quota hit |
| `FILE_TOO_LARGE` | Total Markdown > 10 MB |
| `TOO_MANY_FILES` | More than 200 pages |
| `INVALID_DOC` | A file path doesn't end in `.md` |
| `PATH_TRAVERSAL` | A file path contains `..` |

---

## HTTP Static Server Contracts

**Base**: `https://<did>--<space_id>.pagefire.openhkting.com/`

All responses include:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

| Status | Condition |
|--------|-----------|
| 200 | File found and served |
| 401 | Password-protected deployment, no/wrong passphrase |
| 404 | Unknown subdomain, expired, or deleted deployment |
| 429 | Rate limit exceeded |

**Healthcheck** (internal only, `127.0.0.1:4000`):
```
GET /healthz → 200 OK\nok
```
