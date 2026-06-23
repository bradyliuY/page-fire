import { mkdirSync, rmSync, renameSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { checkQuota } from '../../core/quota.js'
import { extractZip } from '../../core/zip.js'
import { resolveTarget, finalizeDeployment } from '../../core/publish.js'

export async function deployZip(
  args: {
    zip_base64: string
    title?: string
    did?: string
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

  const { did, isUpdate, existing } = resolveTarget(db, token, args.did)
  const tmpDir = join(config.sites, token.id, '.tmp', `${did}-${randomBytes(4).toString('hex')}`)
  const liveDir = join(config.sites, token.id, did)

  let result: { fileCount: number; sizeBytes: number }
  try {
    result = await extractZip(args.zip_base64, tmpDir)
    // Re-check quota with actual size (subtract old size on update)
    const netBytes = isUpdate && existing ? Math.max(0, result.sizeBytes - existing.size_bytes) : result.sizeBytes
    checkQuota(db, token.id, netBytes)
    if (existsSync(liveDir)) rmSync(liveDir, { recursive: true, force: true })
    mkdirSync(join(config.sites, token.id), { recursive: true })
    renameSync(tmpDir, liveDir)
  } catch (err) {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }

  return finalizeDeployment(db, config, token, {
    did, isUpdate, existing,
    fileCount: result.fileCount, sizeBytes: result.sizeBytes,
    opts: {
      did: args.did, title: args.title, access: args.access,
      password: args.password, ttl_days: args.ttl_days, pin: args.pin, spa: args.spa, ip,
    },
  })
}
