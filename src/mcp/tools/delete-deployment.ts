import type Database from 'better-sqlite3'
import { verifyBearer } from '../../auth.js'
import { getDeploymentByDid, deleteDeploymentRow, insertAuditLog } from '../../db/repo.js'
import { deleteDeploymentFiles } from '../../core/deploy.js'
import type { Config } from '../../config.js'

export function deleteDeploymentTool(args: { did: string }, authHeader: string | undefined, db: Database.Database, config: Config, ip?: string) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }
  const d = getDeploymentByDid(db, args.did)
  if (!d || d.token_id !== token.id) throw { code: 'NOT_FOUND', message: 'Deployment not found' }
  deleteDeploymentFiles(config.sites, d.token_id, d.did)
  insertAuditLog(db, { token_id: token.id, deployment_id: d.id, action: 'delete', ip })
  deleteDeploymentRow(db, args.did)
  return { did: args.did, deleted: true }
}
