import { describe, it, expect } from 'vitest'
import { generateTokenSecret, hashToken } from '../../src/auth.js'
import Database from 'better-sqlite3'

describe('generateTokenSecret', () => {
  it('starts with pf_', () => { expect(generateTokenSecret()).toMatch(/^pf_[a-f0-9]{48}$/) })
  it('is unique each call', () => { expect(generateTokenSecret()).not.toBe(generateTokenSecret()) })
})

describe('hashToken', () => {
  it('returns 64-char hex', () => { expect(hashToken('pf_test')).toMatch(/^[a-f0-9]{64}$/) })
  it('is deterministic', () => { expect(hashToken('pf_abc')).toBe(hashToken('pf_abc')) })
  it('different inputs give different hashes', () => { expect(hashToken('pf_a')).not.toBe(hashToken('pf_b')) })
})

describe('verifyBearer', () => {
  it('rejects missing header', async () => {
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.exec('CREATE TABLE tokens (id TEXT PRIMARY KEY, slug TEXT, space_id TEXT, token_hash TEXT, label TEXT, status TEXT, quota_deployments INTEGER, quota_bytes INTEGER, created_at INTEGER)')
    const { verifyBearer } = await import('../../src/auth.js')
    expect(verifyBearer(undefined, db)).toBeNull()
    db.close()
  })
  it('rejects wrong prefix', async () => {
    const db = new Database(':memory:')
    const { verifyBearer } = await import('../../src/auth.js')
    expect(verifyBearer('Bearer wrong_secret', db)).toBeNull()
    db.close()
  })
})
