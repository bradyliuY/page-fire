import { join, resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
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

// Self-hosted mermaid: served from same origin so no CDN dependency / CSP needed.
const MERMAID_ASSET = fileURLToPath(new URL('../assets/mermaid.min.js', import.meta.url))
let mermaidBuf: Buffer | null = null

const REMARK_ASSET = fileURLToPath(new URL('../assets/remark.min.js', import.meta.url))
let remarkBuf: Buffer | null = null

const homeCache = new Map<string, Buffer>()
let cachedDashBuf: Buffer | null = null
let cachedDashKey: string | null = null
let cachedPlayBuf: Buffer | null = null
let cachedPlayKey: string | null = null

function getLang(path: string): 'zh' | 'en' {
  return (path === '/en' || path === '/en/' || path.startsWith('/en/')) ? 'en' : 'zh'
}

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
  const path = url.split('?')[0]

  // Self-hosted mermaid – served from any subdomain so pages can load it same-origin.
  // Falls back to a CDN redirect if the local file hasn't been downloaded yet.
  if (path === '/__pf__/mermaid.min.js') {
    if (!mermaidBuf) {
      try { mermaidBuf = readFileSync(MERMAID_ASSET) } catch { /* not yet downloaded */ }
    }
    if (mermaidBuf) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.setHeader('Content-Length', mermaidBuf.length)
      res.statusCode = 200
      res.end(mermaidBuf)
    } else {
      res.statusCode = 302
      res.setHeader('Location', 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js')
      res.end()
    }
    return
  }

  // Self-hosted remark.js – same-origin load for presentations.
  // Falls back to CDN if the local file hasn't been downloaded yet.
  if (path === '/__pf__/remark.min.js') {
    if (!remarkBuf) {
      try { remarkBuf = readFileSync(REMARK_ASSET) } catch { /* not yet downloaded */ }
    }
    if (remarkBuf) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.setHeader('Content-Length', remarkBuf.length)
      res.statusCode = 200
      res.end(remarkBuf)
    } else {
      res.statusCode = 302
      res.setHeader('Location', 'https://cdnjs.cloudflare.com/ajax/libs/remark/0.15.0/remark.min.js')
      res.end()
    }
    return
  }

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
    if (url === '/dashboard' || url.startsWith('/dashboard?') || url === '/en/dashboard' || url.startsWith('/en/dashboard?')) {
      const lang = getLang(path)
      const dashKey = `${baseDomain}:${lang}`
      if (cachedDashKey !== dashKey) {
        cachedDashBuf = Buffer.from(renderDashboard(baseDomain, lang), 'utf8')
        cachedDashKey = dashKey
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
    if (url === '/playground' || url.startsWith('/playground?') || url === '/en/playground' || url.startsWith('/en/playground?')) {
      const lang = getLang(path)
      const playKey = `${baseDomain}:${lang}`
      if (cachedPlayKey !== playKey) {
        cachedPlayBuf = Buffer.from(renderPlayground(baseDomain, lang), 'utf8')
        cachedPlayKey = playKey
      }
      const buf = cachedPlayBuf!
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 200
      res.end(buf)
      return
    }
    const lang = getLang(path)
    const homeKey = `${baseDomain}:${requireInvite}:${lang}`
    if (!homeCache.has(homeKey)) {
      homeCache.set(homeKey, Buffer.from(renderHome(baseDomain, requireInvite, lang), 'utf8'))
    }
    const buf = homeCache.get(homeKey)!
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
  const rawPath = url === '/' || url === '' ? 'index.html' : url.split('?')[0].replace(/^\//, '')
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

  // Default PageFire favicon for deployed pages that don't ship their own
  // Must run before the SPA fallback so that SPA mode doesn't swallow it
  if ((requestedPath === 'favicon.ico' || requestedPath === 'favicon.png') && !existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Length', FAVICON_PNG.length)
    res.statusCode = 200
    res.end(FAVICON_PNG)
    return
  }

  // SPA fallback: serve index.html for unknown paths so client-side routing works
  if (deployment.spa && !existsSync(filePath)) {
    filePath = join(deployDir, 'index.html')
  }

  serveFile(res, filePath)
}
