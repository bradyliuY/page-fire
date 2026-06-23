import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer, hashToken } from '../../auth.js'
import { generateDid } from '../../core/ids.js'
import { checkQuota } from '../../core/quota.js'
import { deployFiles } from '../../core/deploy.js'
import { createDeployment, insertAuditLog } from '../../db/repo.js'

export async function deployFilesTool(
  args: {
    files: Array<{ path: string; content: string; encoding?: string }>
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

  const bufFiles = args.files.map((f) => ({
    path: f.path,
    content:
      f.encoding === 'base64'
        ? Buffer.from(f.content, 'base64')
        : Buffer.from(f.content, 'utf8'),
  }))

  const totalBytes = bufFiles.reduce((s, f) => s + f.content.length, 0)
  checkQuota(db, token.id, totalBytes)

  const did = generateDid(db)
  const { fileCount, sizeBytes } = deployFiles(config.sites, token.id, did, bufFiles)

  const domain = `${did}-${token.space_id}.${config.baseDomain}`
  const pinned = args.pin ?? false
  const expires_at = pinned ? null : Date.now() + (args.ttl_days ?? 7) * 24 * 60 * 60 * 1000
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
    size_bytes: sizeBytes,
    file_count: fileCount,
    spa: args.spa ?? false,
  })
  insertAuditLog(db, {
    token_id: token.id,
    deployment_id: deployment.id,
    action: 'deploy',
    file_count: fileCount,
    size_bytes: sizeBytes,
    ip,
  })

  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  return {
    url: `${scheme}://${domain}/`,
    did,
    domain,
    file_count: fileCount,
    size_bytes: sizeBytes,
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    pinned,
  }
}
