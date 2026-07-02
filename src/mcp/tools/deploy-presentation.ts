import type Database from 'better-sqlite3'
import type { Config } from '../../config.js'
import { verifyBearer } from '../../auth.js'
import { publish } from '../../core/publish.js'
import { wrapPdfViewer } from '../../core/presentation/pdf.js'
import { convertPptx } from '../../core/presentation/pptx.js'
import type { MarkdownTheme } from '../../core/markdown.js'

export interface DeployPresentationArgs {
  /** Base64-encoded PDF file (mutually exclusive with pptx). */
  pdf?: string
  /** Base64-encoded PPTX file (mutually exclusive with pdf). */
  pptx?: string
  title?: string
  theme?: MarkdownTheme
  did?: string
  access?: 'public' | 'password'
  password?: string
  ttl_days?: number
  pin?: boolean
}

export async function deployPresentation(
  args: DeployPresentationArgs,
  authHeader: string | undefined,
  db: Database.Database,
  config: Config,
  ip?: string,
) {
  const token = verifyBearer(authHeader, db)
  if (!token) throw { code: 'UNAUTHORIZED', message: 'Invalid or missing Bearer token' }

  const hasPdf = !!args.pdf && typeof args.pdf === 'string'
  const hasPptx = !!args.pptx && typeof args.pptx === 'string'

  if (!hasPdf && !hasPptx) {
    throw { code: 'INVALID_CONTENT', message: 'Either pdf or pptx (base64-encoded) is required' }
  }
  if (hasPdf && hasPptx) {
    throw { code: 'INVALID_CONTENT', message: 'Provide either pdf or pptx, not both' }
  }

  if (hasPdf) {
    // ── PDF path ───────────────────────────────────────────────────────
    const pdfBuf = Buffer.from(args.pdf!, 'base64')
    if (pdfBuf.length === 0) {
      throw { code: 'INVALID_CONTENT', message: 'PDF content is empty' }
    }
    if (pdfBuf.length > 50 * 1024 * 1024) {
      throw { code: 'FILE_TOO_LARGE', message: `PDF 文件超过 50 MB 上限（当前 ${(pdfBuf.length / 1024 / 1024).toFixed(1)} MB）。超大文件请用 deploy_files 或 deploy_dir 发布。` }
    }

    const title = args.title?.trim() || 'Document'

    const files = wrapPdfViewer(pdfBuf, { title, theme: args.theme })

    return publish(db, config, token, {
      files,
      did: args.did,
      title,
      access: args.access,
      password: args.password,
      ttl_days: args.ttl_days,
      pin: args.pin,
      ip,
    })
  }

  // ── PPTX path ──────────────────────────────────────────────────────────
  const pptxBuf = Buffer.from(args.pptx!, 'base64')
  if (pptxBuf.length === 0) {
    throw { code: 'INVALID_CONTENT', message: 'PPTX content is empty' }
  }
  if (pptxBuf.length > 50 * 1024 * 1024) {
    throw { code: 'FILE_TOO_LARGE', message: `PPTX 文件超过 50 MB 上限（当前 ${(pptxBuf.length / 1024 / 1024).toFixed(1)} MB）。超大文件请用 deploy_files 或 deploy_dir 发布。` }
  }

  const { files, title, slideCount } = await convertPptx(pptxBuf, {
    title: args.title,
    theme: args.theme,
  })

  return publish(db, config, token, {
    files,
    did: args.did,
    title,
    access: args.access,
    password: args.password,
    ttl_days: args.ttl_days,
    pin: args.pin,
    ip,
  })
}
