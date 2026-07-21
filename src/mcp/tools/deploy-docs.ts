import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'
import { renderDocsSite } from '../../core/docs.js'
import type { MarkdownTheme } from '../../core/markdown.js'

export interface DeployDocsArgs {
  files: Array<{ path: string; markdown: string }>
  title?: string
  author?: string
  theme?: MarkdownTheme
  did?: string
  access?: 'public' | 'password'
  password?: string
  ttl_days?: number
  pin?: boolean
}

export async function deployDocs(
  args: DeployDocsArgs,
  authHeader: string | undefined,
  db: Database.Database,
  config: Config,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  if (!Array.isArray(args.files) || args.files.length === 0) {
    throw { code: 'INVALID_CONTENT', message: 'files (Markdown pages) is required' }
  }
  if (args.files.length > 200) {
    throw { code: 'TOO_MANY_FILES', message: '文档站最多 200 个页面' }
  }
  const totalBytes = args.files.reduce((s, f) => s + Buffer.byteLength(f.markdown ?? ''), 0)
  if (totalBytes > 10 * 1024 * 1024) {
    throw { code: 'FILE_TOO_LARGE', message: `Markdown 总量超过 10 MB 上限（当前 ${(totalBytes / 1024 / 1024).toFixed(1)} MB）。请减少页面数量或压缩内容后再试。` }
  }

  const htmlFiles = renderDocsSite(args.files, { title: args.title, theme: args.theme })

  return publish(db, config, token, {
    files: htmlFiles,
    did: args.did,
    title: args.title,
    author: args.author ?? null,
    access: args.access,
    password: args.password,
    ttl_days: args.ttl_days,
    pin: args.pin,
    ip,
  })
}
