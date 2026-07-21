import type Database from 'better-sqlite3'
import { verifyBearer } from '../../auth.js'
import { getDeploymentByDid } from '../../db/repo.js'
import type { Config } from '../../config.js'

export function getDeploymentTool(args: { did: string }, authHeader: string | undefined, db: Database.Database, config: Config) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }
  const d = getDeploymentByDid(db, args.did)
  if (!d || d.token_id !== token.id) throw { code: 'NOT_FOUND', message: 'Deployment not found' }
  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  return {
    did: d.did,
    url: `${scheme}://${d.domain}/`,
    domain: d.domain,
    title: d.title,
    access: d.access,
    pinned: d.pinned === 1,
    views: d.views,
    author: d.author,
    expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
    size_bytes: d.size_bytes,
    file_count: d.file_count,
    spa: d.spa === 1,
    created_at: new Date(d.created_at).toISOString(),
  }
}
