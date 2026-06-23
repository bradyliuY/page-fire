import { randomBytes } from 'crypto'
import type Database from 'better-sqlite3'

function randomId(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const bytes = randomBytes(length * 2)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

export function generateDid(db: Database.Database): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const did = randomId(6)
    const existing = db.prepare('SELECT 1 FROM deployments WHERE did = ?').get(did)
    if (!existing) return did
  }
  throw new Error('Failed to generate unique did after 5 attempts')
}

export function generateSpaceId(db: Database.Database): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const sid = randomId(8)
    const existing = db.prepare('SELECT 1 FROM tokens WHERE space_id = ?').get(sid)
    if (!existing) return sid
  }
  throw new Error('Failed to generate unique space_id after 5 attempts')
}
