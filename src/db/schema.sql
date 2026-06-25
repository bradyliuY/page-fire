PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS tokens (
  id                TEXT PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  space_id          TEXT UNIQUE NOT NULL,
  token_hash        TEXT NOT NULL,
  token_enc         TEXT,
  label             TEXT,
  user_id           TEXT REFERENCES users(id),
  status            TEXT NOT NULL DEFAULT 'active',
  quota_deployments INTEGER NOT NULL DEFAULT 100,
  quota_bytes       INTEGER NOT NULL DEFAULT 209715200,
  created_at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  token_id      TEXT NOT NULL REFERENCES tokens(id),
  invite_code   TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS invites (
  id          TEXT PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  label       TEXT,
  max_uses    INTEGER NOT NULL DEFAULT 1,
  used        INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
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
  spa         INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deployments_token_id ON deployments(token_id);
CREATE INDEX IF NOT EXISTS idx_deployments_expires_at ON deployments(expires_at) WHERE pinned = 0;

CREATE TABLE IF NOT EXISTS deploy_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id        TEXT,
  deployment_id   TEXT,
  action          TEXT NOT NULL,
  file_count      INTEGER,
  size_bytes      INTEGER,
  ip              TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON deploy_logs(created_at);
