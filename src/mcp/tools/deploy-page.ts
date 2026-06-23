import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer, hashToken } from '../../auth.js'
import { generateDid } from '../../core/ids.js'
import { checkQuota } from '../../core/quota.js'
import { deployFiles } from '../../core/deploy.js'
import { createDeployment, insertAuditLog } from '../../db/repo.js'
import { ValidationError } from '../../core/validate.js'

export interface DeployPageArgs {
  html: string
  title?: string
  access?: 'public' | 'password'
  password?: string
  ttl_days?: number
  pin?: boolean
  spa?: boolean
}

export async function deployPage(
  args: DeployPageArgs,
  authHeader: string | undefined,
  db: Database.Database,
  config: Config,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  if (!args.html || typeof args.html !== 'string') {
    throw { code: 'INVALID_CONTENT', message: 'html is required' }
  }

  const htmlBuf = Buffer.from(args.html, 'utf8')
  if (htmlBuf.length > 10 * 1024 * 1024) {
    throw { code: 'FILE_TOO_LARGE', message: 'html exceeds 10 MB limit' }
  }

  checkQuota(db, token.id, htmlBuf.length)

  const did = generateDid(db)
  const domain = `${did}-${token.space_id}.${config.baseDomain}`

  const { fileCount, sizeBytes } = deployFiles(config.sites, token.id, did, [
    { path: 'index.html', content: args.html },
  ])

  const pinned = args.pin ?? false
  const ttl = args.ttl_days ?? 7
  const expires_at = pinned ? null : Date.now() + ttl * 24 * 60 * 60 * 1000
  const pass_hash =
    args.access === 'password' && args.password ? hashToken(args.password) : null

  const deployment = createDeployment(db, {
    token_id: token.id,
    did,
    domain,
    title: args.title ?? null,
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
    ip: ip ?? undefined,
  })

  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  return {
    url: `${scheme}://${domain}/`,
    did,
    domain,
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    pinned,
  }
}
