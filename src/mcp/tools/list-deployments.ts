import type Database from 'better-sqlite3'
import { verifyBearer } from '../../auth.js'
import { listDeployments } from '../../db/repo.js'
import type { Config } from '../../config.js'

export function listDeploymentsTool(args: { include_expired?: boolean }, authHeader: string | undefined, db: Database.Database, config: Config) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }
  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  const rows = listDeployments(db, token.id, args.include_expired ?? false)
  const deployments = rows.map(d => ({
    did: d.did,
    url: `${scheme}://${d.domain}/`,
    title: d.title,
    access: d.access,
    pinned: d.pinned === 1,
    expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
    size_bytes: d.size_bytes,
    file_count: d.file_count,
    spa: d.spa === 1,
    created_at: new Date(d.created_at).toISOString(),
  }))
  return { deployments, total: deployments.length }
}
