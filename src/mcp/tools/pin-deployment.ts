import type Database from 'better-sqlite3'
import { verifyBearer } from '../../auth.js'
import { getDeploymentByDid, updateDeployment, insertAuditLog } from '../../db/repo.js'

export function pinDeploymentTool(args: { did: string }, authHeader: string | undefined, db: Database.Database, ip?: string) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }
  const d = getDeploymentByDid(db, args.did)
  if (!d || d.token_id !== token.id) throw { code: 'NOT_FOUND', message: 'Deployment not found' }
  updateDeployment(db, args.did, { pinned: 1, expires_at: null })
  insertAuditLog(db, { token_id: token.id, deployment_id: d.id, action: 'pin', ip })
  return { did: args.did, pinned: true, expires_at: null }
}
