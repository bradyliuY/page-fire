import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

// ── Token repo ──────────────────────────────────────────────────────────────

export interface TokenRow {
  id: string; slug: string; space_id: string; token_hash: string
  label: string | null; status: string; quota_deployments: number
  quota_bytes: number; created_at: number
}

export function createToken(db: Database.Database, fields: Omit<TokenRow, 'id' | 'created_at'>): TokenRow {
  const id = randomUUID()
  const created_at = Date.now()
  db.prepare(`INSERT INTO tokens (id,slug,space_id,token_hash,label,status,quota_deployments,quota_bytes,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, fields.slug, fields.space_id, fields.token_hash, fields.label ?? null, fields.status, fields.quota_deployments, fields.quota_bytes, created_at)
  return { id, created_at, ...fields }
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

export function updateDeployment(db: Database.Database, did: string, updates: Partial<Pick<DeploymentRow, 'pinned' | 'expires_at' | 'access' | 'pass_hash' | 'size_bytes' | 'file_count'>>): void {
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

// ── Audit log ────────────────────────────────────────────────────────────────

export interface AuditFields {
  token_id?: string; deployment_id?: string; action: string
  file_count?: number; size_bytes?: number; ip?: string
}

export function insertAuditLog(db: Database.Database, fields: AuditFields): void {
  db.prepare(`INSERT INTO deploy_logs (token_id,deployment_id,action,file_count,size_bytes,ip,created_at)
    VALUES (?,?,?,?,?,?,?)`).run(fields.token_id ?? null, fields.deployment_id ?? null, fields.action, fields.file_count ?? null, fields.size_bytes ?? null, fields.ip ?? null, Date.now())
}
