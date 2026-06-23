import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'
import { renderMarkdownPage, type MarkdownTheme } from '../../core/markdown.js'

export interface DeployMarkdownArgs {
  markdown: string
  title?: string
  theme?: MarkdownTheme
  did?: string
  access?: 'public' | 'password'
  password?: string
  ttl_days?: number
  pin?: boolean
}

export async function deployMarkdown(
  args: DeployMarkdownArgs,
  authHeader: string | undefined,
  db: Database.Database,
  config: Config,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  if (!args.markdown || typeof args.markdown !== 'string') {
    throw { code: 'INVALID_CONTENT', message: 'markdown is required' }
  }
  if (Buffer.byteLength(args.markdown) > 5 * 1024 * 1024) {
    throw { code: 'FILE_TOO_LARGE', message: 'markdown exceeds 5 MB limit' }
  }

  const html = renderMarkdownPage(args.markdown, { title: args.title, theme: args.theme })

  return publish(db, config, token, {
    files: [{ path: 'index.html', content: html }],
    did: args.did,
    title: args.title,
    access: args.access,
    password: args.password,
    ttl_days: args.ttl_days,
    pin: args.pin,
    ip,
  })
}
