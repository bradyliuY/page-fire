import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'

export interface DeployPageArgs {
  html: string
  title?: string
  did?: string
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
  if (Buffer.byteLength(args.html) > 10 * 1024 * 1024) {
    throw { code: 'FILE_TOO_LARGE', message: `HTML 内容超过 10 MB 上限（当前 ${(Buffer.byteLength(args.html) / 1024 / 1024).toFixed(1)} MB）。大文件请用 deploy_dir 本地上传方式发布，避免把内容塞进工具参数。` }
  }

  return publish(db, config, token, {
    files: [{ path: 'index.html', content: args.html }],
    did: args.did,
    title: args.title,
    access: args.access,
    password: args.password,
    ttl_days: args.ttl_days,
    pin: args.pin,
    spa: args.spa,
    ip,
  })
}
