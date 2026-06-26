import type Database from 'better-sqlite3'
import { randomUUID, randomBytes } from 'crypto'

// ── Token repo ──────────────────────────────────────────────────────────────

export interface TokenRow {
  id: string; slug: string; space_id: string; token_hash: string
  label: string | null; user_id: string | null; status: string
  quota_deployments: number; quota_bytes: number; created_at: number
}

export function createToken(db: Database.Database, fields: Omit<TokenRow, 'id' | 'created_at' | 'user_id'> & { user_id?: string | null }): TokenRow {
  const id = randomUUID()
  const created_at = Date.now()
  const user_id = fields.user_id ?? null
  db.prepare(`INSERT INTO tokens (id,slug,space_id,token_hash,label,user_id,status,quota_deployments,quota_bytes,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, fields.slug, fields.space_id, fields.token_hash, fields.label ?? null, user_id, fields.status, fields.quota_deployments, fields.quota_bytes, created_at)
  return { id, created_at, user_id, ...fields }
}

// ── User-scoped API key management ────────────────────────────────────────────

export interface UserKeyRow extends TokenRow { token_enc: string | null; deployment_count: number }

export function listTokensByUser(db: Database.Database, userId: string): UserKeyRow[] {
  return db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM deployments d WHERE d.token_id = t.id) AS deployment_count
    FROM tokens t WHERE t.user_id = ? ORDER BY t.created_at DESC
  `).all(userId) as UserKeyRow[]
}

export function getTokenByIdForUser(db: Database.Database, id: string, userId: string): TokenRow | undefined {
  return db.prepare('SELECT * FROM tokens WHERE id = ? AND user_id = ?').get(id, userId) as TokenRow | undefined
}

export function revokeTokenById(db: Database.Database, id: string): void {
  db.prepare("UPDATE tokens SET status = 'disabled' WHERE id = ?").run(id)
}

export function countActiveTokensByUser(db: Database.Database, userId: string): number {
  const r = db.prepare("SELECT COUNT(*) AS n FROM tokens WHERE user_id = ? AND status = 'active'").get(userId) as { n: number }
  return r.n
}

export function getTokenByHash(db: Database.Database, hash: string): TokenRow | undefined {
  return db.prepare('SELECT * FROM tokens WHERE token_hash = ?').get(hash) as TokenRow | undefined
}

export function getTokenBySpaceId(db: Database.Database, spaceId: string): TokenRow | undefined {
  return db.prepare('SELECT * FROM tokens WHERE space_id = ?').get(spaceId) as TokenRow | undefined
}

export function getTokenBySlug(db: Database.Database, slug: string): TokenRow | undefined {
  return db.prepare('SELECT * FROM tokens WHERE slug = ?').get(slug) as TokenRow | undefined
}

export function listTokens(db: Database.Database): TokenRow[] {
  return db.prepare('SELECT * FROM tokens ORDER BY created_at DESC').all() as TokenRow[]
}

export function disableToken(db: Database.Database, slug: string): void {
  db.prepare("UPDATE tokens SET status = 'disabled' WHERE slug = ?").run(slug)
}

export function rotateSpaceId(db: Database.Database, slug: string, newSpaceId: string): void {
  db.prepare('UPDATE tokens SET space_id = ? WHERE slug = ?').run(newSpaceId, slug)
}

export function setSpaceIdByTokenId(db: Database.Database, tokenId: string, newSpaceId: string): void {
  const existing = db.prepare('SELECT id FROM tokens WHERE space_id = ? AND id != ?').get(newSpaceId, tokenId)
  if (existing) throw { code: 'SPACE_ID_TAKEN', message: `space_id "${newSpaceId}" is already in use` }
  db.prepare('UPDATE tokens SET space_id = ? WHERE id = ?').run(newSpaceId, tokenId)
}

// ── Deployment repo ──────────────────────────────────────────────────────────

export interface DeploymentRow {
  id: string; token_id: string; did: string; domain: string
  title: string | null; access: string; pass_hash: string | null
  pinned: number; expires_at: number | null; size_bytes: number
  file_count: number; spa: number; created_at: number; updated_at: number
}

export interface CreateDeploymentFields {
  token_id: string; did: string; domain: string; title?: string | null
  access?: string; pass_hash?: string | null; pinned?: boolean
  expires_at?: number | null; size_bytes: number; file_count: number
  spa?: boolean
}

export function createDeployment(db: Database.Database, fields: CreateDeploymentFields): DeploymentRow {
  const id = randomUUID()
  const now = Date.now()
  const row: DeploymentRow = {
    id, token_id: fields.token_id, did: fields.did, domain: fields.domain,
    title: fields.title ?? null, access: fields.access ?? 'public',
    pass_hash: fields.pass_hash ?? null, pinned: fields.pinned ? 1 : 0,
    expires_at: fields.expires_at ?? null, size_bytes: fields.size_bytes,
    file_count: fields.file_count, spa: fields.spa ? 1 : 0,
    created_at: now, updated_at: now,
  }
  db.prepare(`INSERT INTO deployments (id,token_id,did,domain,title,access,pass_hash,pinned,expires_at,size_bytes,file_count,spa,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(row.id, row.token_id, row.did, row.domain, row.title, row.access, row.pass_hash, row.pinned, row.expires_at, row.size_bytes, row.file_count, row.spa, row.created_at, row.updated_at)
  return row
}

export function getDeploymentByDid(db: Database.Database, did: string): DeploymentRow | undefined {
  return db.prepare('SELECT * FROM deployments WHERE did = ?').get(did) as DeploymentRow | undefined
}

export function listDeployments(db: Database.Database, tokenId: string, includeExpired = false): DeploymentRow[] {
  const now = Date.now()
  if (includeExpired) {
    return db.prepare('SELECT * FROM deployments WHERE token_id = ? ORDER BY created_at DESC').all(tokenId) as DeploymentRow[]
  }
  return db.prepare('SELECT * FROM deployments WHERE token_id = ? AND (pinned = 1 OR expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC').all(tokenId, now) as DeploymentRow[]
}

export interface UserDeploymentRow extends DeploymentRow {
  token_label: string | null
  space_id: string
}

/** All of a user's deployments across every API key, joined with the owning token. */
export function listDeploymentsByUser(db: Database.Database, userId: string, includeExpired = false): UserDeploymentRow[] {
  const now = Date.now()
  const expiry = includeExpired ? '' : 'AND (d.pinned = 1 OR d.expires_at IS NULL OR d.expires_at > ?)'
  const params = includeExpired ? [userId] : [userId, now]
  return db.prepare(`
    SELECT d.*, t.label AS token_label, t.space_id AS space_id
    FROM deployments d JOIN tokens t ON d.token_id = t.id
    WHERE t.user_id = ? ${expiry}
    ORDER BY t.created_at ASC, d.created_at DESC
  `).all(...params) as UserDeploymentRow[]
}

/** A single deployment, returned only if it belongs to one of the user's tokens. */
export function getDeploymentForUser(db: Database.Database, did: string, userId: string): DeploymentRow | undefined {
  return db.prepare(`
    SELECT d.* FROM deployments d JOIN tokens t ON d.token_id = t.id
    WHERE d.did = ? AND t.user_id = ?
  `).get(did, userId) as DeploymentRow | undefined
}

export function updateDeployment(db: Database.Database, did: string, updates: Partial<Pick<DeploymentRow, 'pinned' | 'expires_at' | 'access' | 'pass_hash' | 'size_bytes' | 'file_count' | 'title' | 'spa'>>): void {
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(updates), Date.now(), did]
  db.prepare(`UPDATE deployments SET ${sets}, updated_at = ? WHERE did = ?`).run(...values)
}

export function deleteDeploymentRow(db: Database.Database, did: string): void {
  db.prepare('DELETE FROM deployments WHERE did = ?').run(did)
}

export function listExpiredDeployments(db: Database.Database): DeploymentRow[] {
  const now = Date.now()
  return db.prepare('SELECT * FROM deployments WHERE pinned = 0 AND expires_at IS NOT NULL AND expires_at <= ?').all(now) as DeploymentRow[]
}

// ── User repo ────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string; username: string; password_hash: string
  token_id: string; invite_code: string | null; created_at: number
}

export function createUser(db: Database.Database, fields: Omit<UserRow, 'id' | 'created_at'>): UserRow {
  const id = randomUUID()
  const created_at = Date.now()
  db.prepare(`INSERT INTO users (id,username,password_hash,token_id,invite_code,created_at)
    VALUES (?,?,?,?,?,?)`).run(id, fields.username, fields.password_hash, fields.token_id, fields.invite_code ?? null, created_at)
  return { id, created_at, ...fields }
}

export function getUserByUsername(db: Database.Database, username: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
}

export function updateUserPassword(db: Database.Database, userId: string, passwordHash: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
}

// ── Invite code repo ─────────────────────────────────────────────────────────

export interface InviteRow {
  id: string; code: string; label: string | null
  max_uses: number; used: number; created_by: string | null; created_at: number
}

export function createInvite(db: Database.Database, fields: { code: string; label?: string | null; max_uses?: number; created_by?: string | null }): InviteRow {
  const id = randomUUID()
  const row: InviteRow = {
    id, code: fields.code, label: fields.label ?? null,
    max_uses: fields.max_uses ?? 1, used: 0,
    created_by: fields.created_by ?? null, created_at: Date.now(),
  }
  db.prepare(`INSERT INTO invites (id,code,label,max_uses,used,created_by,created_at)
    VALUES (?,?,?,?,?,?,?)`).run(row.id, row.code, row.label, row.max_uses, row.used, row.created_by, row.created_at)
  return row
}

export function getInviteByCode(db: Database.Database, code: string): InviteRow | undefined {
  return db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as InviteRow | undefined
}

export function useInvite(db: Database.Database, code: string): void {
  db.prepare('UPDATE invites SET used = used + 1 WHERE code = ?').run(code)
}

export function listInvites(db: Database.Database): InviteRow[] {
  return db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all() as InviteRow[]
}

// ── Session repo ─────────────────────────────────────────────────────────────

const SESSION_TTL = 30 * 24 * 3600_000 // 30 days

export function createSession(db: Database.Database, userId: string): string {
  const id = randomBytes(32).toString('hex')
  const now = Date.now()
  db.prepare('INSERT INTO sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)')
    .run(id, userId, now, now + SESSION_TTL)
  return id
}

export function getSessionUser(db: Database.Database, sid: string): UserRow | undefined {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sid) as { user_id: string; expires_at: number } | undefined
  if (!s || s.expires_at <= Date.now()) return undefined
  return db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id) as UserRow | undefined
}

export function deleteSession(db: Database.Database, sid: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sid)
}

// ── Audit log ────────────────────────────────────────────────────────────────

export interface AuditFields {
  token_id?: string; deployment_id?: string; action: string
  file_count?: number; size_bytes?: number; ip?: string
}

export function insertAuditLog(db: Database.Database, fields: AuditFields): void {
  db.prepare(`INSERT INTO deploy_logs (token_id,deployment_id,action,file_count,size_bytes,ip,created_at)
    VALUES (?,?,?,?,?,?,?)`).run(fields.token_id ?? null, fields.deployment_id ?? null, fields.action, fields.file_count ?? null, fields.size_bytes ?? null, fields.ip ?? null, Date.now())
}
