import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'

export async function deployFilesTool(
  args: {
    files: Array<{ path: string; content: string; encoding?: string }>
    title?: string
    author?: string
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

  const bufFiles = args.files.map((f) => ({
    path: f.path,
    content:
      f.encoding === 'base64'
        ? Buffer.from(f.content, 'base64')
        : Buffer.from(f.content, 'utf8'),
  }))

  if (!bufFiles.some((f) => f.path === 'index.html' || f.path === './index.html')) {
    throw { code: 'MISSING_INDEX', message: 'files must include index.html at the root' }
  }

  return publish(db, config, token, {
    files: bufFiles,
    did: args.did,
    title: args.title,
    author: args.author ?? null,
    access: args.access,
    password: args.password,
    ttl_days: args.ttl_days,
    pin: args.pin,
    spa: args.spa,
    ip,
  })
}
