import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'
import { renderMarkdownPage, type MarkdownTheme } from '../../core/markdown.js'
import { renderMarkdownSlides } from '../../core/slides.js'

export interface DeployMarkdownArgs {
  markdown: string
  title?: string
  author?: string
  mode?: 'article' | 'slide'
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
    throw { code: 'FILE_TOO_LARGE', message: `Markdown 内容超过 5 MB 上限（当前 ${(Buffer.byteLength(args.markdown) / 1024 / 1024).toFixed(1)} MB）。大文件建议拆分成 deploy_docs 多页发布，或使用 deploy_dir 本地上传。` }
  }

  const mode = args.mode ?? 'article'
  const html = mode === 'slide'
    ? renderMarkdownSlides(args.markdown, { title: args.title, theme: args.theme })
    : renderMarkdownPage(args.markdown, { title: args.title, theme: args.theme })

  return publish(db, config, token, {
    files: [{ path: 'index.html', content: html }],
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
