import { mkdirSync, rmSync, renameSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer, hashToken } from '../../auth.js'
import { generateDid } from '../../core/ids.js'
import { checkQuota } from '../../core/quota.js'
import { extractZip } from '../../core/zip.js'
import { createDeployment, insertAuditLog } from '../../db/repo.js'

export async function deployZip(
  args: {
    zip_base64: string
    title?: string
    access?: string
    password?: string
    ttl_days?: number
    pin?: boolean
    spa?: boolean
  },
  authHeader: string | undefined,
  db: Database.Database,
  config: Config,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  // Pre-check quota with 0 new bytes (validates token is not over existing limit)
  checkQuota(db, token.id, 0)

  const did = generateDid(db)
  const tmpDir = join(config.sites, token.id, '.tmp', `${did}-${randomBytes(4).toString('hex')}`)
  const liveDir = join(config.sites, token.id, did)

  let result: { fileCount: number; sizeBytes: number }
  try {
    result = await extractZip(args.zip_base64, tmpDir)
    // Re-check quota with actual size
    checkQuota(db, token.id, result.sizeBytes)
    if (existsSync(liveDir)) rmSync(liveDir, { recursive: true, force: true })
    mkdirSync(join(config.sites, token.id), { recursive: true })
    renameSync(tmpDir, liveDir)
  } catch (err) {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }

  const domain = `${did}-${token.space_id}.${config.baseDomain}`
  const pinned = args.pin ?? false
  const ttl = args.ttl_days ?? 7
  const expires_at = pinned ? null : Date.now() + ttl * 24 * 60 * 60 * 1000
  const pass_hash =
    args.access === 'password' && args.password ? hashToken(args.password) : null

  const deployment = createDeployment(db, {
    token_id: token.id,
    did,
    domain,
    title: args.title,
    access: args.access ?? 'public',
    pass_hash,
    pinned,
    expires_at,
    size_bytes: result.sizeBytes,
    file_count: result.fileCount,
    spa: args.spa ?? false,
  })
  insertAuditLog(db, {
    token_id: token.id,
    deployment_id: deployment.id,
    action: 'deploy',
    file_count: result.fileCount,
    size_bytes: result.sizeBytes,
    ip,
  })

  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  return {
    url: `${scheme}://${domain}/`,
    did,
    domain,
    file_count: result.fileCount,
    size_bytes: result.sizeBytes,
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    pinned,
  }
}
