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
