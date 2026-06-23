import { join, resolve } from 'path'
import { existsSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import type Database from 'better-sqlite3'
import { serve404, serve401, serveFile } from './serve.js'
import { getTokenBySpaceId, getDeploymentByDid } from '../db/repo.js'
import { hashToken } from '../auth.js'
import { renderHome } from './home.js'
import { SECURITY_HEADERS } from './headers.js'

let cachedHomeBuf: Buffer | null = null
let cachedHomeDomain: string | null = null

export function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  sitesDir: string,
  baseDomain: string,
): void {
  const host = (req.headers['host'] ?? '').split(':')[0]
  const url = req.url ?? '/'

  // Health check (internal only)
  if (url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }

  // Root domain → serve product homepage
  if (host === baseDomain) {
    if (cachedHomeDomain !== baseDomain) {
      cachedHomeBuf = Buffer.from(renderHome(baseDomain), 'utf8')
      cachedHomeDomain = baseDomain
    }
    const buf = cachedHomeBuf!
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Length', buf.length)
    res.statusCode = 200
    res.end(buf)
    return
  }

  // Parse subdomain: <did>-<space_id>.baseDomain or <space_id>.baseDomain
  // Legacy format <did>--<space_id> is also supported for backward compatibility
  const suffix = `.${baseDomain}`
  if (!host.endsWith(suffix)) {
    serve404(res)
    return
  }
  const sub = host.slice(0, host.length - suffix.length)

  let did: string | null = null
  let spaceId: string

  if (sub.includes('--')) {
    // Legacy: <did>--<space_id>
    const idx = sub.lastIndexOf('--')
    did = sub.slice(0, idx)
    spaceId = sub.slice(idx + 2)
  } else if (sub.includes('-')) {
    // Current: <did>-<space_id> (did=6 chars, space_id=8 chars, both [a-z0-9])
    const idx = sub.indexOf('-')
    did = sub.slice(0, idx)
    spaceId = sub.slice(idx + 1)
  } else {
    spaceId = sub
  }

  const token = getTokenBySpaceId(db, spaceId)
  if (!token || token.status !== 'active') {
    serve404(res)
    return
  }

  if (!did) {
    // space_id-only URL (dashboard) not yet implemented → 404
    serve404(res)
    return
  }

  const deployment = getDeploymentByDid(db, did)
  if (!deployment || deployment.token_id !== token.id) {
    serve404(res)
    return
  }

  // Check expiry
  if (!deployment.pinned && deployment.expires_at && deployment.expires_at <= Date.now()) {
    serve404(res)
    return
  }

  // Password check
  if (deployment.access === 'password' && deployment.pass_hash) {
    const supplied = req.headers['x-passphrase'] as string | undefined
    if (!supplied || hashToken(supplied) !== deployment.pass_hash) {
      serve401(res)
      return
    }
  }

  // Resolve file path
  const deployDir = join(sitesDir, String(deployment.token_id), deployment.did)
  const rawPath = url === '/' || url === '' ? 'index.html' : url.split('?')[0]
  let requestedPath: string
  try {
    requestedPath = decodeURIComponent(rawPath)
  } catch {
    serve404(res)
    return
  }
  if (requestedPath.includes('..') || requestedPath.includes('\0')) {
    serve404(res)
    return
  }
  let filePath = join(deployDir, requestedPath)

  // Security: ensure resolved path is within deployDir
  if (!resolve(filePath).startsWith(resolve(deployDir))) {
    serve404(res)
    return
  }

  // SPA fallback: serve index.html for unknown paths so client-side routing works
  if (deployment.spa && !existsSync(filePath)) {
    filePath = join(deployDir, 'index.html')
  }

  serveFile(res, filePath)
}
