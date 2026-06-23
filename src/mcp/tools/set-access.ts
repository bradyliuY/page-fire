import type Database from 'better-sqlite3'
import { verifyBearer, hashToken } from '../../auth.js'
import { getDeploymentByDid, updateDeployment, insertAuditLog } from '../../db/repo.js'

export interface SetAccessArgs {
  did: string
  access: 'public' | 'password'
  password?: string
}

export function setAccessTool(
  args: SetAccessArgs,
  authHeader: string | undefined,
  db: Database.Database,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  const d = getDeploymentByDid(db, args.did)
  if (!d || d.token_id !== token.id) throw { code: 'NOT_FOUND', message: 'Deployment not found' }

  if (args.access === 'password' && !args.password) {
    throw { code: 'INVALID_ARGS', message: 'password required when access=password' }
  }

  const pass_hash = args.access === 'password' ? hashToken(args.password!) : null

  updateDeployment(db, args.did, { access: args.access, pass_hash })

  insertAuditLog(db, {
    token_id: token.id,
    deployment_id: d.id,
    action: 'set_access',
    ip: ip ?? undefined,
  })

  return { did: args.did, access: args.access }
}
