import type Database from 'better-sqlite3'
import type { Config } from '../config.js'
import type { TokenRow } from '../auth.js'
import { hashToken } from '../auth.js'
import { generateDid } from './ids.js'
import { checkQuota } from './quota.js'
import { deployFiles, type FileEntry } from './deploy.js'
import { validateCustomDid } from './validate.js'
import {
  createDeployment, getDeploymentByDid, updateDeployment, insertAuditLog,
} from '../db/repo.js'

export interface PublishOpts {
  files: FileEntry[]
  did?: string                 // custom alias / update target; random when omitted
  title?: string | null
  access?: string
  password?: string
  ttl_days?: number
  pin?: boolean
  spa?: boolean
  ip?: string
}

export interface PublishResult {
  url: string
  did: string
  domain: string
  updated: boolean
  file_count: number
  size_bytes: number
  expires_at: string | null
  pinned: boolean
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Resolve the target deployment id and whether this is an in-place update.
 * - custom did owned by this token  → update in place (URL unchanged)
 * - custom did taken by someone else → error
 * - custom did free / random        → fresh deployment
 */
export function resolveTarget(db: Database.Database, token: TokenRow, customDid?: string) {
  if (!customDid) return { did: generateDid(db), isUpdate: false, existing: undefined }
  validateCustomDid(customDid)
  const existing = getDeploymentByDid(db, customDid)
  if (existing) {
    if (existing.token_id !== token.id) {
      throw { code: 'DID_TAKEN', message: `"${customDid}" 已被占用，请换一个名字` }
    }
    return { did: customDid, isUpdate: true, existing }
  }
  return { did: customDid, isUpdate: false, existing: undefined }
}

/**
 * Shared publish path for deploy_page / deploy_files / deploy_markdown.
 * (deploy_zip keeps its own streaming extraction but reuses resolveTarget.)
 */
/** Shared per-file size ceiling for all inline/upload deploy paths. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export function publish(
  db: Database.Database, config: Config, token: TokenRow, opts: PublishOpts,
): PublishResult {
  const { did, isUpdate, existing } = resolveTarget(db, token, opts.did)

  // Per-file 10 MB ceiling — guards every shared deploy path (page/files/docs/upload).
  // Larger payloads should go through the local-upload flow, not inline tool args.
  for (const f of opts.files) {
    const size = typeof f.content === 'string' ? Buffer.byteLength(f.content) : f.content.length
    if (size > MAX_FILE_BYTES) {
      throw {
        code: 'FILE_TOO_LARGE',
        message: `文件 "${f.path}" 为 ${(size / 1024 / 1024).toFixed(1)} MB，超过单文件 10 MB 上限。大文件请用本地上传方式（pagefire-mcp 的 deploy_dir）发布，避免把内容塞进工具参数。`,
      }
    }
  }

  const incomingBytes = opts.files.reduce(
    (s, f) => s + (typeof f.content === 'string' ? Buffer.byteLength(f.content) : f.content.length), 0)
  // On update the old files are replaced, so don't double-count their size.
  const netBytes = isUpdate && existing ? Math.max(0, incomingBytes - existing.size_bytes) : incomingBytes
  checkQuota(db, token.id, netBytes)

  const { fileCount, sizeBytes } = deployFiles(config.sites, token.id, did, opts.files)

  return finalizeDeployment(db, config, token, { did, isUpdate, existing, fileCount, sizeBytes, opts })
}

interface FinalizeArgs {
  did: string
  isUpdate: boolean
  existing: ReturnType<typeof getDeploymentByDid>
  fileCount: number
  sizeBytes: number
  opts: Omit<PublishOpts, 'files'>
}

/**
 * Write the deployment row (insert or in-place update) + audit log, and build the result.
 * Used by publish() and by deploy_zip (which extracts files via its own streaming path).
 */
export function finalizeDeployment(
  db: Database.Database, config: Config, token: TokenRow, a: FinalizeArgs,
): PublishResult {
  const { did, isUpdate, existing, fileCount, sizeBytes, opts } = a
  const domain = `${did}-${token.space_id}.${config.baseDomain}`

  // Preserve existing lifecycle/access on update unless the caller overrides it.
  const pinned = opts.pin ?? (existing ? existing.pinned === 1 : false)
  let expires_at: number | null
  if (pinned) {
    expires_at = null
  } else if (opts.ttl_days != null || !existing) {
    expires_at = Date.now() + (opts.ttl_days ?? 7) * DAY
  } else {
    expires_at = existing.expires_at
  }
  const access = opts.access ?? (existing ? existing.access : 'public')
  const pass_hash = access === 'password'
    ? (opts.password ? hashToken(opts.password) : (existing ? existing.pass_hash : null))
    : null
  const spa = opts.spa ?? (existing ? existing.spa === 1 : false)
  const title = opts.title ?? (existing ? existing.title : null)

  if (isUpdate) {
    updateDeployment(db, did, {
      size_bytes: sizeBytes, file_count: fileCount, title,
      access, pass_hash, pinned: pinned ? 1 : 0, expires_at, spa: spa ? 1 : 0,
    })
  } else {
    createDeployment(db, {
      token_id: token.id, did, domain, title, access, pass_hash,
      pinned, expires_at, size_bytes: sizeBytes, file_count: fileCount, spa,
    })
  }

  insertAuditLog(db, {
    token_id: token.id, action: isUpdate ? 'redeploy' : 'deploy',
    file_count: fileCount, size_bytes: sizeBytes, ip: opts.ip,
  })

  const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
  return {
    url: `${scheme}://${domain}/`,
    did, domain, updated: isUpdate,
    file_count: fileCount, size_bytes: sizeBytes,
    expires_at: expires_at ? new Date(expires_at).toISOString() : null,
    pinned,
  }
}
