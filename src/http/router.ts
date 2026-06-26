import { join, resolve } from 'path'
import { existsSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import type Database from 'better-sqlite3'
import { serve404, serve401, serveFile } from './serve.js'
import { getTokenBySpaceId, getDeploymentByDid } from '../db/repo.js'
import { hashToken } from '../auth.js'
import { renderHome } from './home.js'
import { renderDashboard } from './dashboard.js'
import { renderPlayground } from './playground.js'
import { SECURITY_HEADERS } from './headers.js'
import { LOGO_PNG, FAVICON_PNG } from './assets.js'

let cachedHomeBuf: Buffer | null = null
let cachedHomeKey: string | null = null
let cachedDashBuf: Buffer | null = null
let cachedDashKey: string | null = null
let cachedPlayBuf: Buffer | null = null
let cachedPlayKey: string | null = null

export function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  sitesDir: string,
  baseDomain: string,
  requireInvite = false,
): void {
  const host = (req.headers['host'] ?? '').split(':')[0]
  const url = req.url ?? '/'

  // Health check (internal only)
  if (url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }

  // Root domain → serve product homepage / dashboard
  if (host === baseDomain) {
    // Brand assets (logo + favicon), base64-embedded, long-cached (ignore any query string)
    const assetPath = url.split('?')[0]
    if (assetPath === '/logo.png' || assetPath === '/favicon.ico' || assetPath === '/favicon.png') {
      const buf = assetPath === '/logo.png' ? LOGO_PNG : FAVICON_PNG
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 200
      res.end(buf)
      return
    }
    // Dashboard shell (auth enforced client-side via /api/me + httpOnly session cookie)
    if (url === '/dashboard' || url.startsWith('/dashboard?')) {
      if (cachedDashKey !== baseDomain) {
        cachedDashBuf = Buffer.from(renderDashboard(baseDomain), 'utf8')
        cachedDashKey = baseDomain
      }
      const buf = cachedDashBuf!
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 200
      res.end(buf)
      return
    }
    // Playground (auth enforced client-side via /api/me; deploys proxied through /api/playground)
    if (url === '/playground' || url.startsWith('/playground?')) {
      if (cachedPlayKey !== baseDomain) {
        cachedPlayBuf = Buffer.from(renderPlayground(baseDomain), 'utf8')
        cachedPlayKey = baseDomain
      }
      const buf = cachedPlayBuf!
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 200
      res.end(buf)
      return
    }
    const homeKey = `${baseDomain}:${requireInvite}`
    if (cachedHomeKey !== homeKey) {
      cachedHomeBuf = Buffer.from(renderHome(baseDomain, requireInvite), 'utf8')
      cachedHomeKey = homeKey
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

  // Default PageFire favicon for deployed pages that don't ship their own
  if ((requestedPath === '/favicon.ico' || requestedPath === '/favicon.png') && !existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Length', FAVICON_PNG.length)
    res.statusCode = 200
    res.end(FAVICON_PNG)
    return
  }

  serveFile(res, filePath)
}
