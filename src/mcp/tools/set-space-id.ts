import type Database from 'better-sqlite3'
import { verifyBearer } from '../../auth.js'
import { setSpaceIdByTokenId, insertAuditLog } from '../../db/repo.js'
import { validateCustomSpaceId } from '../../core/validate.js'

export function setSpaceIdTool(
  args: { space_id: string },
  authHeader: string | undefined,
  db: Database.Database,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  validateCustomSpaceId(args.space_id)
  setSpaceIdByTokenId(db, token.id, args.space_id)

  insertAuditLog(db, { token_id: token.id, action: 'set_space_id', ip })

  return {
    space_id: args.space_id,
    warning: 'All existing deployment URLs have changed. Previous URLs are no longer valid.',
  }
}
