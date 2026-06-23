import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

describe('generateDid', () => {
  it('returns 6-char alphanumeric string', async () => {
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.exec('CREATE TABLE deployments (did TEXT UNIQUE NOT NULL)')
    const { generateDid } = await import('../../src/core/ids.js')
    const did = generateDid(db)
    expect(did).toMatch(/^[a-z0-9]{6}$/)
    db.close()
  })
  it('retries on collision', async () => {
    const db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.exec('CREATE TABLE deployments (did TEXT UNIQUE NOT NULL)')
    const { generateDid } = await import('../../src/core/ids.js')
    const first = generateDid(db)
    db.prepare('INSERT INTO deployments (did) VALUES (?)').run(first)
    const second = generateDid(db)
    expect(second).toMatch(/^[a-z0-9]{6}$/)
    expect(second).not.toBe(first)
    db.close()
  })
})
