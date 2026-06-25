# Data Model: PageFire

**Date**: 2026-06-23

All entities are persisted in a single SQLite database (`/var/pagefire/pagefire.db`) opened in WAL mode. File content lives on the filesystem under `/var/pagefire/sites/`.

---

## Entities

### Token

Represents an operator-issued credential granting publish access.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | TEXT PK | UUID v4 | Internal identifier; used as directory name under `sites/` |
| `slug` | TEXT UNIQUE NOT NULL | ≤64 chars, `[a-z0-9-]` | Human label for operators; never in URLs |
| `space_id` | TEXT UNIQUE NOT NULL | 6–8 chars, `[a-z0-9]`, high entropy | Appears in deployment URLs; rotatable |
| `token_hash` | TEXT NOT NULL | SHA-256 hex | Never stored plain-text |
| `label` | TEXT | nullable | Free-form note (e.g. "given to Alice") |
| `status` | TEXT NOT NULL | `'active'` or `'disabled'` | Default `'active'` |
| `quota_deployments` | INTEGER NOT NULL | Default 100 | Max concurrent live deployments |
| `quota_bytes` | INTEGER NOT NULL | Default 209715200 (200 MB) | Total bytes across all deployments |
| `created_at` | INTEGER NOT NULL | Unix timestamp ms | |

**State transitions**: `active → disabled` (via `token disable`); `disabled → active` (manual DB update).
**space_id rotation**: UPDATE `space_id` to new random value; old deployment URLs become 404 immediately (subdomain lookup fails).

---

### Deployment

Represents one publish event and its served content.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | TEXT PK | UUID v4 | Internal identifier |
| `token_id` | TEXT NOT NULL | FK → tokens.id | Owner |
| `did` | TEXT UNIQUE NOT NULL | 6 chars, `[a-z0-9]` | URL component; random per deployment |
| `domain` | TEXT UNIQUE NOT NULL | `<did>--<space_id>.pagefire.openhkting.com` | Snapshot at publish time |
| `title` | TEXT | nullable | Optional display name |
| `access` | TEXT NOT NULL | `'public'` or `'password'` | Default `'public'` |
| `pass_hash` | TEXT | nullable | SHA-256 of passphrase; only set when `access='password'` |
| `pinned` | INTEGER NOT NULL | 0 or 1 | 1 = never expires |
| `expires_at` | INTEGER | nullable | Unix timestamp ms; null when `pinned=1` |
| `size_bytes` | INTEGER NOT NULL | Default 0 | Sum of all file sizes |
| `file_count` | INTEGER NOT NULL | Default 0 | Number of files |
| `created_at` | INTEGER NOT NULL | Unix timestamp ms | |
| `updated_at` | INTEGER NOT NULL | Unix timestamp ms | Updated on pin/access change |

**File layout**: `/var/pagefire/sites/<token_id>/<did>/` — arbitrary file tree rooted here.
**State transitions**:
- Temporary → Pinned: `pinned=1`, `expires_at=NULL`
- Active → Expired: `gc` sets `expires_at` ≤ now; files deleted; row retained for 7 days as tombstone then hard-deleted.
- Active → Deleted: immediate file removal + row deletion.

**Validation rules**:
- `size_bytes` ≤ 52428800 per deployment (50 MB; configurable)
- `file_count` ≤ 500 per deployment
- `did` generation: retry up to 5× on collision

---

### AuditLog

Append-only record of every mutating action.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | INTEGER PK AUTOINCREMENT | | |
| `token_id` | TEXT | nullable | Omitted on system gc actions |
| `deployment_id` | TEXT | nullable | Omitted for token-level actions |
| `action` | TEXT NOT NULL | `deploy`, `delete`, `pin`, `expire`, `token_create`, `token_disable`, `token_rotate` | |
| `file_count` | INTEGER | nullable | |
| `size_bytes` | INTEGER | nullable | |
| `ip` | TEXT | nullable | Client IP from `X-Real-IP` header |
| `created_at` | INTEGER NOT NULL | Unix timestamp ms | |

---

## SQLite Schema (canonical)

```sql
PRAGMA journal_mode=WAL;

CREATE TABLE tokens (
  id                  TEXT PRIMARY KEY,
  slug                TEXT UNIQUE NOT NULL,
  space_id            TEXT UNIQUE NOT NULL,
  token_hash          TEXT NOT NULL,
  label               TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  quota_deployments   INTEGER NOT NULL DEFAULT 100,
  quota_bytes         INTEGER NOT NULL DEFAULT 209715200,
  created_at          INTEGER NOT NULL
);

CREATE TABLE deployments (
  id          TEXT PRIMARY KEY,
  token_id    TEXT NOT NULL REFERENCES tokens(id),
  did         TEXT UNIQUE NOT NULL,
  domain      TEXT UNIQUE NOT NULL,
  title       TEXT,
  access      TEXT NOT NULL DEFAULT 'public',
  pass_hash   TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  file_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_deployments_token_id ON deployments(token_id);
CREATE INDEX idx_deployments_expires_at ON deployments(expires_at) WHERE pinned = 0;

CREATE TABLE deploy_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id        TEXT,
  deployment_id   TEXT,
  action          TEXT NOT NULL,
  file_count      INTEGER,
  size_bytes      INTEGER,
  ip              TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_logs_created_at ON deploy_logs(created_at);
```

---

## Filesystem Layout

```
/var/pagefire/
├── pagefire.db                          # SQLite database
└── sites/
    └── <token_id>/                      # UUID, fixed even after space_id rotation
        ├── .tmp/                        # Staging area for atomic writes
        │   └── <did>-<rand>/            # Temp dir per in-flight deployment
        └── <did>/                       # Committed deployment directory
            ├── index.html
            ├── css/
            └── img/
```
