import { createHash, randomBytes } from 'crypto'
import type Database from 'better-sqlite3'

export function generateTokenSecret(): string {
  return 'pf_' + randomBytes(24).toString('hex')
}

export function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex')
}

export interface TokenRow {
  id: string
  slug: string
  space_id: string
  token_hash: string
  label: string | null
  status: string
  quota_deployments: number
  quota_bytes: number
  created_at: number
}

export function verifyBearer(authHeader: string | undefined, db: Database.Database): TokenRow | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const plain = authHeader.slice(7).trim()
  if (!plain.startsWith('pf_')) return null
  const hash = hashToken(plain)
  const row = db.prepare('SELECT * FROM tokens WHERE token_hash = ? AND status = ?').get(hash, 'active') as TokenRow | undefined
  return row ?? null
}
