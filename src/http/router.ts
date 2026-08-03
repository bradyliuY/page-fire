import { join, resolve, extname } from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { timingSafeEqual } from 'crypto'
import type { IncomingMessage, ServerResponse } from 'http'
import type Database from 'better-sqlite3'
import { serve404, serve401, serveFile, serveHtmlWithCounter } from './serve.js'
import { ViewCounter } from './counter.js'
import { getTokenBySpaceId, getDeploymentByDid } from '../db/repo.js'
import { hashToken } from '../auth.js'
import { renderHome } from './home.js'
import { renderDashboard } from './dashboard.js'
import { renderPlayground } from './playground.js'
import { SECURITY_HEADERS } from './headers.js'
import { LOGO_PNG, FAVICON_PNG, FAVICON_32_PNG, APPLE_TOUCH_ICON_PNG, FAVICON_ICO } from './assets.js'
import { config } from '../config.js'
import { renderLoginPage, sanitizeNextPath } from './login.js'
import { sessionKey, parseSessionCookie, verifySessionToken, buildSetCookie, buildClearCookie } from './session.js'

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

interface AssetDef { buf: Buffer; type: string }

// Brand assets served on the root domain (logo + favicon family), base64-embedded, long-cached.
// /favicon.ico is a real ICO (image/x-icon) so crawlers probing it directly (e.g. Google faviconV2) accept it.
const BRAND_ASSETS: Record<string, AssetDef> = {
  '/logo.png': { buf: LOGO_PNG, type: 'image/png' },
  '/favicon.ico': { buf: FAVICON_ICO, type: 'image/x-icon' },
  '/favicon.png': { buf: FAVICON_PNG, type: 'image/png' },
  '/favicon-64.png': { buf: FAVICON_PNG, type: 'image/png' },
  '/favicon-32.png': { buf: FAVICON_32_PNG, type: 'image/png' },
  '/apple-touch-icon.png': { buf: APPLE_TOUCH_ICON_PNG, type: 'image/png' },
}

// Default favicon family for deployed pages that don't ship their own.
// Mirrors the root-domain set so the links injected by serve.ts resolve here.
const DEFAULT_PAGE_FAVICONS: Record<string, AssetDef> = {
  'favicon.ico': { buf: FAVICON_ICO, type: 'image/x-icon' },
  'favicon.png': { buf: FAVICON_PNG, type: 'image/png' },
  'favicon-64.png': { buf: FAVICON_PNG, type: 'image/png' },
  'favicon-32.png': { buf: FAVICON_32_PNG, type: 'image/png' },
  'apple-touch-icon.png': { buf: APPLE_TOUCH_ICON_PNG, type: 'image/png' },
}

// HMAC key for password-gate session cookies, derived once from the server secret.
let sessionKeyBuf: Buffer | null = null
function getSessionKey(): Buffer {
  if (!sessionKeyBuf) sessionKeyBuf = sessionKey(config.tokenEncKey)
  return sessionKeyBuf
}

// Simple in-memory login rate limiter (per client IP): 10 failures per 5 minutes.
const LOGIN_WINDOW_MS = 5 * 60 * 1000
const LOGIN_MAX_FAILS = 10
const loginFails = new Map<string, number[]>()
function loginRateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = (loginFails.get(ip) ?? []).filter(t => now - t < LOGIN_WINDOW_MS)
  return arr.length >= LOGIN_MAX_FAILS
}
function recordLoginFail(ip: string): void {
  const now = Date.now()
  const arr = (loginFails.get(ip) ?? []).filter(t => now - t < LOGIN_WINDOW_MS)
  arr.push(now)
  loginFails.set(ip, arr)
}

/** Read a small request body (form posts). Rejects over the limit. */
function readBody(req: IncomingMessage, limit = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Constant-time compare of two pre-hashed hex strings. */
function hashEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** A request that should show the login gate instead of a bare 401. */
function isPageRequest(p: string): boolean {
  if (p.startsWith('_pf/')) return false
  if (p === 'favicon.ico' || p === 'favicon.png' || p === 'favicon-32.png' || p === 'favicon-64.png') return false
  const ext = extname(p)
  return p === 'index.html' || ext === '.html' || ext === '.htm' || ext === ''
}

function getLang(path: string): 'zh' | 'en' {
  return (path === '/en' || path === '/en/' || path.startsWith('/en/')) ? 'en' : 'zh'
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  sitesDir: string,
  baseDomain: string,
  requireInvite = false,
  counter?: ViewCounter,
  wechatSignApi?: string,
): Promise<void> {
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

  // WeChat webview verification file
  if (path === '/hXvfiH7OHs.txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.statusCode = 200
    res.end('226ebfa4533c3b83094f717737cf4ffe')
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
    // Brand assets (logo + favicon family), base64-embedded, long-cached (ignore any query string)
    const assetPath = url.split('?')[0]
    const brand = BRAND_ASSETS[assetPath]
    if (brand) {
      res.setHeader('Content-Type', brand.type)
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.setHeader('Content-Length', brand.buf.length)
      res.statusCode = 200
      res.end(brand.buf)
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

  const scheme = baseDomain === 'localhost' ? 'http' : 'https'

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

  // Resolve file path (before the access gate so login/logout handling and
  // page-vs-asset detection can run)
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

  const isProtected = deployment.access === 'password' && !!deployment.pass_hash

  // ── Password-gate endpoints ─────────────────────────────────────────────
  // Login: POST /_pf/login (form: password + next). Rate-limited per IP.
  if (isProtected && requestedPath === '_pf/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress ?? 'unknown'
    if (loginRateLimited(ip)) {
      res.statusCode = 429
      res.end('Too Many Requests')
      return
    }
    const body = await readBody(req).catch(() => '')
    const form = new URLSearchParams(body)
    const password = form.get('password') ?? ''
    const next = sanitizeNextPath(form.get('next'))
    if (!password || !hashEquals(hashToken(password), deployment.pass_hash!)) {
      recordLoginFail(ip)
      res.writeHead(302, { Location: `/?error=1&next=${encodeURIComponent(next)}` })
      res.end()
      return
    }
    res.writeHead(302, {
      Location: next,
      'Set-Cookie': buildSetCookie(deployment.did, getSessionKey(), scheme === 'https'),
    })
    res.end()
    return
  }

  // Logout: POST /_pf/logout
  if (isProtected && requestedPath === '_pf/logout' && req.method === 'POST') {
    res.writeHead(302, { Location: '/', 'Set-Cookie': buildClearCookie(scheme === 'https') })
    res.end()
    return
  }

  // ── Password gate: API header (X-Passphrase) OR signed session cookie ───
  if (isProtected) {
    const supplied = req.headers['x-passphrase'] as string | undefined
    const headerOk = !!supplied && hashEquals(hashToken(supplied), deployment.pass_hash!)
    const cookieOk = verifySessionToken(parseSessionCookie(req.headers.cookie), deployment.did, getSessionKey())
    if (!headerOk && !cookieOk) {
      // Page requests get the branded login gate; other assets just get 401.
      if (isPageRequest(requestedPath)) {
        const query = new URLSearchParams(url.split('?')[1] ?? '')
        const hadError = query.get('error') === '1'
        const qNext = query.get('next')
        const next = qNext ? sanitizeNextPath(qNext) : (requestedPath === 'index.html' ? '/' : '/' + requestedPath)
        const body = renderLoginPage({ error: hadError, next })
        const buf = Buffer.from(body, 'utf8')
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Content-Length', buf.length)
        res.statusCode = 200
        res.end(buf)
        return
      }
      serve401(res)
      return
    }
  }

  // Default PageFire favicon for deployed pages that don't ship their own
  // Must run before the SPA fallback so that SPA mode doesn't swallow it
  const defaultIcon = DEFAULT_PAGE_FAVICONS[requestedPath]
  if (defaultIcon && !existsSync(filePath)) {
    res.setHeader('Content-Type', defaultIcon.type)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Length', defaultIcon.buf.length)
    res.statusCode = 200
    res.end(defaultIcon.buf)
    return
  }

  // ── View counter endpoint ──────────────────────────────────────────────
  if (requestedPath === '_pf/counter' && counter) {
    const method = req.method ?? 'GET'
    const origin = req.headers['origin'] as string | undefined
    // CORS for same-origin only (safe for the deployment's own subdomain)
    if (origin) {
      const allowed = `${scheme}://${host}`
      if (origin === allowed || origin === `${scheme}://${host.split(':')[0]}`) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      }
    }
    if (method === 'OPTIONS') {
      res.writeHead(204); res.end()
      return
    }
    const views = method === 'POST'
      ? counter.increment(deployment.did)
      : counter.getViews(deployment.did)
    const body = Buffer.from(JSON.stringify({ views }), 'utf8')
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Length', body.length)
    res.statusCode = 200
    res.end(body)
    return
  }

  // SPA fallback: serve index.html for unknown paths so client-side routing works.
  // Only applies to extensionless paths (SPA routes like /about) to avoid
  // swallowing static assets (chart.min.js, favicon.ico, etc.) with HTML content.
  const ext = extname(requestedPath)
  if (deployment.spa && !existsSync(filePath) && (ext === '' || ext === '.html' || ext === '.htm')) {
    filePath = join(deployDir, 'index.html')
  }

  const cspOverride = deployment.content_security_policy

  // Serve HTML files with view counter injection (when counter is enabled)
  if (counter && (ext === '.html' || ext === '.htm')) {
    serveHtmlWithCounter(res, filePath, {
      views: counter.getViews(deployment.did),
      created_at: deployment.created_at,
      updated_at: deployment.updated_at,
      author: deployment.author ?? token.label,
      title: deployment.title,
      description: deployment.description,
      og_image: deployment.og_image,
      wechat_app_id: token.wechat_app_id,
      wechat_sign_api: wechatSignApi,
      logo_url: `${scheme}://${baseDomain}/logo.png`,
      page_url: `${scheme}://${deployment.domain}/`,
      site_name: baseDomain,
    }, cspOverride)
    return
  }

  serveFile(res, filePath, false, cspOverride)
}
