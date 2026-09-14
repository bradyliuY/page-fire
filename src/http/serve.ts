import { createReadStream, statSync, existsSync, readFileSync } from 'fs'
import type { Stats } from 'fs'
import { extname, join } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { gzipSync } from 'zlib'
import { SECURITY_HEADERS, buildSecurityHeaders } from './headers.js'
import { sanitizeSvgCached } from '../core/svg.js'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  '.pps': 'application/vnd.ms-powerpoint',
  '.potx': 'application/vnd.openxmlformats-officedocument.presentationml.template',
}

// ── Conditional-request / compression helpers ────────────────────────────
// Pure functions so the serving rules stay unit-testable without HTTP.

/** Weak ETag from file stat — zero hashing cost, stable across redeploys that don't touch the file. */
function etagFor(stat: { size: number; mtimeMs: number }): string {
  return `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`
}

/**
 * RFC 7232 If-None-Match evaluation with weak comparison: the `W/` prefix is
 * ignored so a strong etag from the client matches our weak one with the same
 * opaque part. `*` matches any existing resource.
 */
export function etagMatches(header: string | undefined, etag: string): boolean {
  if (!header) return false
  const opaque = (v: string): string => {
    let s = v.trim()
    if (s.startsWith('W/')) s = s.slice(2)
    return s
  }
  return header.split(',').some(raw => {
    const p = raw.trim()
    if (!p) return false
    if (p === '*') return true
    return opaque(p) === opaque(etag)
  })
}

export type ParsedRange = { start: number; end: number } | null | 'invalid'

/**
 * Single-range `bytes=` parser. Multi-range and unparseable headers return
 * null (= serve the full 200 body); syntactically valid ranges that can't be
 * satisfied (start ≥ size, zero-length suffix) return 'invalid' (= 416).
 * End is clamped to size-1.
 */
export function parseRange(header: string | undefined, size: number): ParsedRange {
  if (!header) return null
  const m = /^bytes=(.*)$/.exec(header.trim())
  if (!m) return null
  const spec = m[1]
  if (spec.includes(',')) return null // multi-range: not worth the assembly work → full 200
  const range = /^(\d*)-(\d*)$/.exec(spec)
  if (!range) return null
  const [, a, b] = range
  if (a === '' && b === '') return null
  if (a === '') {
    // suffix form: last N bytes
    const n = parseInt(b, 10)
    if (n === 0) return 'invalid'
    return { start: Math.max(0, size - n), end: size - 1 }
  }
  const start = parseInt(a, 10)
  if (start >= size) return 'invalid'
  const end = b === '' ? size - 1 : Math.min(parseInt(b, 10), size - 1)
  return { start, end }
}

/** True when the client's Accept-Encoding lists gzip with a nonzero q-value. */
export function acceptsGzip(header: string | undefined): boolean {
  if (!header) return false
  return header.split(',').some(part => {
    const [token, ...params] = part.trim().split(';').map(s => s.trim())
    if (token.toLowerCase() !== 'gzip') return false
    return !params.some(p => {
      const q = /^q=(.*)$/.exec(p)
      return !!q && parseFloat(q[1]) === 0
    })
  })
}

/** Text-ish types worth gzipping. Images/fonts/video already carry their own compression. */
const COMPRESSIBLE = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.map', '.txt', '.md', '.svg', '.xml'])

export function isCompressible(ext: string): boolean {
  return COMPRESSIBLE.has(ext.toLowerCase())
}

// ── Request-path resolution ──────────────────────────────────────────────

export interface ResolvedPath { filePath: string | null; found: boolean }

function statIsFile(p: string): boolean {
  try { return statSync(p).isFile() } catch { return false }
}

/**
 * Resolve a deployment-relative request path to the file to serve.
 *
 *  - direct file hit → served as-is
 *  - directory → its index.html when present (Next.js export / Hugo / Jekyll
 *    trailingSlash form). Without an index it stays a 404 — a directory that
 *    exists must never SPA-fall-through to the root shell.
 *  - missing + SPA + page-ish extension ('', .html, .htm) → the ROOT
 *    index.html shell (verified to exist).
 *
 * Assumes requestedPath already passed traversal checks in the router.
 */
export function resolveServePath(deployDir: string, requestedPath: string, spa: boolean): ResolvedPath {
  const direct = join(deployDir, requestedPath)
  try {
    const st = statSync(direct)
    if (st.isFile()) return { filePath: direct, found: true }
    if (st.isDirectory()) {
      const idx = join(direct, 'index.html')
      if (statIsFile(idx)) return { filePath: idx, found: true }
      return { filePath: null, found: false }
    }
  } catch { /* missing → maybe SPA fallback */ }

  const ext = extname(requestedPath)
  if (spa && (ext === '' || ext === '.html' || ext === '.htm')) {
    const shell = join(deployDir, 'index.html')
    if (statIsFile(shell)) return { filePath: shell, found: true }
  }
  return { filePath: null, found: false }
}

/**
 * 404 for a deployment path that doesn't resolve: serve the site's own
 * 404.html when it ships one (status 404, never cache-sticky), else the
 * platform's bare 404. Platform-level 404s (bad host / unknown token /
 * expired) do NOT go through here.
 */
export function serveSite404(res: ServerResponse, deployDir: string, cspOverride?: string | null): void {
  const p = join(deployDir, '404.html')
  if (statIsFile(p)) {
    try {
      const buf = readFileSync(p)
      for (const [k, v] of Object.entries(buildSecurityHeaders(cspOverride))) res.setHeader(k, v)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 404
      res.end(buf)
      return
    } catch { /* unreadable → platform 404 */ }
  }
  serve404(res)
}

// ── Static file serving ──────────────────────────────────────────────────
//
// One entry point for every deployment file. Branch order is load-bearing:
// stat → 304 short-circuit → SVG sanitize → Range → compression choice →
// stream. Body headers (Content-Length/Encoding) are set last, per branch,
// so they always describe the bytes actually sent.

export interface ServeOpts {
  req?: IncomingMessage          // enables If-None-Match/Range/Accept-Encoding handling
  cspOverride?: string | null
  forceDownload?: boolean        // Content-Disposition: attachment (legacy flag, currently unused)
}

const MIN_GZ_BYTES = 1024        // smaller bodies compress poorly and add latency
const MAX_GZ_BYTES = 2 * 1024 * 1024 // keep sync gzipSync off the event loop for big files

// gzipSync results keyed by path+mtime. Files are immutable between deploys,
// so mtime is a sound invalidation key. Bounded by total bytes (LRU) — gz
// buffers plus everything else must stay well under the 200MB PM2 ceiling.
const GZ_CACHE_MAX_BYTES = 24 * 1024 * 1024
const gzCache = new Map<string, Buffer>()
let gzCacheBytes = 0

function getGzipped(filePath: string, raw: Buffer, mtimeMs: number): Buffer {
  const key = `${filePath}:${Math.floor(mtimeMs)}`
  const hit = gzCache.get(key)
  if (hit) {
    // LRU refresh: re-insert to move to the back of the eviction order.
    gzCache.delete(key)
    gzCache.set(key, hit)
    return hit
  }
  const gz = gzipSync(raw, { level: 6 })
  gzCache.set(key, gz)
  gzCacheBytes += gz.length
  while (gzCacheBytes > GZ_CACHE_MAX_BYTES && gzCache.size > 1) {
    const oldestKey = gzCache.keys().next().value
    if (oldestKey === undefined) break
    gzCacheBytes -= gzCache.get(oldestKey)!.length
    gzCache.delete(oldestKey)
  }
  return gz
}

/** Set the common 200/206 header group that doesn't depend on body encoding. */
function setCommonHeaders(res: ServerResponse, headers: Record<string, string>, ext: string, etag: string, cc: string, withAcceptRanges: boolean): void {
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', cc)
  res.setHeader('ETag', etag)
  if (isCompressible(ext)) res.setHeader('Vary', 'Accept-Encoding')
  if (withAcceptRanges) res.setHeader('Accept-Ranges', 'bytes')
}

/** Stream a byte range (or the whole file) with the existing crash-safe error handler. */
function streamRange(res: ServerResponse, filePath: string, start?: number, end?: number): void {
  const stream = createReadStream(filePath, start !== undefined ? { start, end } : undefined)
  // A stream 'error' with no listener is fatal (uncaughtException → process crash). Handle it.
  stream.on('error', (err) => {
    console.error('[serve] stream error:', err)
    if (!res.headersSent) { res.statusCode = 404; res.end('Not Found') }
    else res.destroy()
  })
  stream.pipe(res)
}

export function serveFile(res: ServerResponse, filePath: string, opts: ServeOpts = {}): void {
  let stat: Stats
  try {
    stat = statSync(filePath)
  } catch {
    serve404(res)
    return
  }
  if (stat.isDirectory()) { serve404(res); return }   // never stream a directory → would throw EISDIR

  const ext = extname(filePath).toLowerCase()
  const etag = etagFor(stat)
  const cc = (ext === '.html' || ext === '.htm')
    ? 'no-cache'
    : 'public, max-age=300, stale-while-revalidate=86400'
  const req = opts.req
  const headers = buildSecurityHeaders(opts.cspOverride)
  const compressible = isCompressible(ext)

  // CORS: allow cross-origin image loading (needed by WeChat WKWebView
  // long-press save, which internally uses canvas and requires CORS headers).
  res.setHeader('Access-Control-Allow-Origin', '*')

  const rangeHeader = req?.headers.range as string | undefined
  const canRange = ext !== '.html' && ext !== '.htm' && ext !== '.svg'
  const inGzSize = stat.size >= MIN_GZ_BYTES && stat.size <= MAX_GZ_BYTES
  const wantGz = compressible && inGzSize && !rangeHeader
    && acceptsGzip(req?.headers['accept-encoding'] as string | undefined)

  // 304 short-circuit — before any body work. Per RFC 7232 a 304 carries the
  // cache validators but no representation headers (no CT/CL/CE).
  if (req && etagMatches(req.headers['if-none-match'], etag)) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.setHeader('Cache-Control', cc)
    res.setHeader('ETag', etag)
    if (compressible) res.setHeader('Vary', 'Accept-Encoding')
    res.statusCode = 304
    res.end()
    return
  }

  // SVG: sanitized (memoized) output goes through the buffered tail below —
  // deterministic per mtime, so the gz cache applies to it as well.
  if (ext === '.svg') {
    const clean = sanitizeSvgCached(filePath, stat)
    if (clean === null) {
      // Sanitize failed → raw attachment fallback (error-shaped: no ETag/Range/gzip).
      try {
        const raw = readFileSync(filePath)
        for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('Content-Disposition', 'attachment; filename="image.svg"')
        res.setHeader('Content-Length', raw.length)
        res.statusCode = 200
        res.end(raw)
      } catch {
        serve404(res)
      }
      return
    }
    const buf = Buffer.from(clean, 'utf8')
    setCommonHeaders(res, headers, ext, etag, cc, false)
    if (wantGz) {
      const gz = getGzipped(filePath, buf, stat.mtimeMs)
      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Length', gz.length)
      res.statusCode = 200
      res.end(gz)
    } else {
      res.setHeader('Content-Length', buf.length)
      if (opts.forceDownload) res.setHeader('Content-Disposition', 'attachment')
      res.statusCode = 200
      res.end(buf)
    }
    return
  }

  // Range requests: identity only, never combined with Content-Encoding.
  if (canRange && rangeHeader) {
    const parsed = parseRange(rangeHeader, stat.size)
    if (parsed === 'invalid') {
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
      res.setHeader('Content-Range', `bytes */${stat.size}`)
      res.setHeader('Accept-Ranges', 'bytes')
      res.statusCode = 416
      res.end()
      return
    }
    if (parsed) {
      setCommonHeaders(res, headers, ext, etag, cc, true)
      res.setHeader('Content-Range', `bytes ${parsed.start}-${parsed.end}/${stat.size}`)
      res.setHeader('Content-Length', parsed.end - parsed.start + 1)
      res.statusCode = 206
      streamRange(res, filePath, parsed.start, parsed.end)
      return
    }
    // null → unparseable/multi-range: fall through to a full 200.
  }

  if (wantGz) {
    let raw: Buffer
    try { raw = readFileSync(filePath) } catch { serve404(res); return }
    const gz = getGzipped(filePath, raw, stat.mtimeMs)
    setCommonHeaders(res, headers, ext, etag, cc, false)
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Content-Length', gz.length)
    res.statusCode = 200
    res.end(gz)
    return
  }

  if (compressible && inGzSize && !rangeHeader) {
    // Compressible-size file but identity response: buffer it so
    // Content-Length stays exact (and to avoid one stream stat round-trip).
    let raw: Buffer
    try { raw = readFileSync(filePath) } catch { serve404(res); return }
    setCommonHeaders(res, headers, ext, etag, cc, false)
    res.setHeader('Content-Length', raw.length)
    if (opts.forceDownload) res.setHeader('Content-Disposition', 'attachment')
    res.statusCode = 200
    res.end(raw)
    return
  }

  // Everything else streams raw: binaries (mp4/pdf/fonts/images) and
  // oversized text files.
  setCommonHeaders(res, headers, ext, etag, cc, canRange)
  res.setHeader('Content-Length', stat.size)
  if (opts.forceDownload) res.setHeader('Content-Disposition', 'attachment')
  res.statusCode = 200
  streamRange(res, filePath)
}

export function serve404(res: ServerResponse): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end('<!doctype html><html><body><h1>404 Not Found</h1></body></html>')
}

/**
 * Serve an HTML file with a view counter injected before </body>.
 *
 * Reads the file into memory for injection. If the file is larger than MAX_READ,
 * falls back to streaming it as-is (no counter injection).
 */
const MAX_HTML_INJECT = 2 * 1024 * 1024 // 2 MB — skip injection for larger HTML

/** Optional page metadata shown inline in PageFire-generated footers. */
export interface PageMeta {
  views: number
  created_at?: number
  updated_at?: number
  author?: string | null
  title?: string | null
  description?: string | null    // explicit description from deployment params
  og_image?: string | null
  wechat_app_id?: string | null
  wechat_sign_api?: string    // WeChat JS-SDK signature API endpoint
  logo_url?: string           // platform logo for fallback
  page_url?: string           // full URL of this page (e.g. https://mysite.pagefire.openhkt.com/)
  site_name?: string          // site/brand name for og:site_name
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeJsStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

/**
 * Auto-detect the first meaningful image from HTML content.
 * Skips data: URIs, SVGs, and tiny icons (favicons etc.).
 */
function extractFirstImage(html: string): string | null {
  // Match src="...", src='...', or src=... (unquoted)
  const imgRegex = /<img[^>]+src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>"']+))[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1] ?? match[2] ?? match[3]
    if (src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.includes('favicon')) {
      return src
    }
  }
  return null
}

/**
 * Resolve an image src to an absolute URL, using the page's own URL as base.
 * Handles: absolute, protocol-relative (//), root-relative (/), and relative paths.
 */
function resolveOgImageUrl(src: string, pageUrl?: string): string {
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (!pageUrl) return src  // can't resolve without a base
  try {
    return new URL(src, pageUrl).href
  } catch {
    return src
  }
}

/**
 * Auto-detect page title from <title> or first <h1>.
 */
function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  return null
}

/**
 * Auto-detect <meta name="description" content="..."> from page HTML.
 * Matches both name="description" and name='description'.
 */
function extractMetaDescription(html: string): string | null {
  const re = /<meta\s+[^>]*name\s*=\s*(?:"description"|'description')[^>]*content\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\/?>/i
  const m = html.match(re)
  if (m) return (m[1] ?? m[2] ?? '').trim() || null
  // Also try reversed attribute order (content=... name=description)
  const re2 = /<meta\s+[^>]*content\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*name\s*=\s*(?:"description"|'description')[^>]*\/?>/i
  const m2 = html.match(re2)
  if (m2) return (m2[1] ?? m2[2] ?? '').trim() || null
  return null
}

/** Strip HTML tags, decode common entities, and return clean text. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find the first meaningful <p> within <body>, excluding nav/menu/footer areas.
 * Caps at ~160 chars, truncates at a word boundary.
 */
function extractFirstParagraph(html: string): string | null {
  // Locate <body> first so we skip <head> content
  const bodyStart = html.search(/<body[\s>]/i)
  if (bodyStart === -1) return null
  const bodyHtml = html.slice(bodyStart)

  const pRe = /<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = pRe.exec(bodyHtml)) !== null) {
    const text = stripHtml(m[1]).trim()
    // Skip empty, too short (< 15 chars), or likely nav/UI text
    if (text.length < 15) continue
    // Skip if it looks like a nav/menu/footer/button
    if (/^(导航|菜单|首页|上一页|下一页|返回|加载|menu|nav|footer|home|back|loading)/i.test(text)) continue
    // Truncate at ~157 chars at a word boundary
    if (text.length <= 160) return text
    const truncated = text.slice(0, 157)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 80 ? truncated.slice(0, lastSpace) + '…' : truncated + '…'
  }
  return null
}

/**
 * Default favicon family injected into deployed pages that don't ship their own.
 * Paths are root-relative so they resolve on the page's own subdomain, where the
 * router serves the PageFire default (favicon-32/64/ico + apple-touch-icon).
 */
const FAVICON_BLOCK = `  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
  <link rel="icon" type="image/png" sizes="64x64" href="/favicon-64.png">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`

/**
 * Inject the default favicon family + theme-color before </head>.
 * A page that already declares any icon link keeps its own — never overridden.
 */
export function injectFaviconLinks(html: string): string {
  if (/<link\b[^>]*rel\s*=\s*(["'])[^"']*icon[^"']*\1/i.test(html)) return html
  const headIdx = html.indexOf('</head>')
  if (headIdx === -1) return html
  const themeColor = /<meta\b[^>]*name\s*=\s*(["'])theme-color\1/i.test(html)
    ? ''
    : '\n  <meta name="theme-color" content="#0a0a0b">'
  const block = '\n' + FAVICON_BLOCK + themeColor + '\n'
  return html.slice(0, headIdx) + block + html.slice(headIdx)
}

/**
 * Inject OG meta tags and/or WeChat JS-SDK into HTML before </head>.
 *
 * OG tag resolution priority (high → low):
 *   1. Explicit meta values (from deploy params)
 *   2. Auto-detected from HTML content (<img>, <title>, <h1>)
 *   3. Not injected (the page defines its own, or nothing useful found)
 *
 * Only injects if the page doesn't already define any OG tags (user's own tags take precedence).
 */
function injectHeadMeta(html: string, meta: PageMeta): string {
  let result = injectFaviconLinks(html)

  // ── Fix relative og:image paths in existing user OG tags ─────────────
  // e.g. <meta property="og:image" content="../img.jpg"> → absolute URL
  if (meta.page_url) {
    const metaTagRegex = /<meta[^>]*\/?>/gi
    let mt: RegExpExecArray | null
    while ((mt = metaTagRegex.exec(result)) !== null) {
      const tag = mt[0]
      const isOgImage = /\bproperty\s*=\s*(?:"og:image"|'og:image')/i.test(tag)
      if (!isOgImage) continue
      const contentMatch = tag.match(/content\s*=\s*(?:"([^"]+)"|'([^']+)')/i)
      if (!contentMatch) continue
      const content = contentMatch[1] ?? contentMatch[2] ?? ''
      if (content.startsWith('http://') || content.startsWith('https://') || !content) continue
      const resolved = resolveOgImageUrl(content, meta.page_url)
      if (resolved === content) continue
      const quote = contentMatch[0].includes(`"${content}"`) ? '"' : "'"
      const fixed = tag.replace(`${quote}${content}${quote}`, `${quote}${resolved}${quote}`)
      result = result.slice(0, mt.index) + fixed + result.slice(mt.index + tag.length)
      metaTagRegex.lastIndex = mt.index + fixed.length
    }
  }

  // ── Extract og:image from user's own (now-resolved) OG tags ──────
  function getExistingOgImage(h: string): string | null {
    const metaTagRegex = /<meta[^>]*\/?>/gi
    let mt: RegExpExecArray | null
    while ((mt = metaTagRegex.exec(h)) !== null) {
      const tag = mt[0]
      const isOgImage = /\bproperty\s*=\s*(?:"og:image"|'og:image')/i.test(tag)
      if (!isOgImage) continue
      const cm = tag.match(/content\s*=\s*(?:"([^"]+)"|'([^']+)')/i)
      if (cm) return cm[1] ?? cm[2] ?? null
    }
    return null
  }

  // ── Resolve OG values: explicit → auto-detect from HTML → platform defaults ──
  const hasOgTag = /<meta\s+[^>]*property="og:/i.test(result)
  const ogTitle = meta.title || (hasOgTag ? null : extractTitle(result)) || null
  const existingOgImage = hasOgTag ? getExistingOgImage(result) : null
  const rawImage = meta.og_image || existingOgImage || (hasOgTag ? null : extractFirstImage(result)) || meta.logo_url || null
  const ogImage = rawImage ? resolveOgImageUrl(rawImage, meta.page_url) : null
  const ogDesc = meta.description
    || (hasOgTag ? null : extractMetaDescription(result))
    || (hasOgTag ? null : extractFirstParagraph(result))
    || (hasOgTag ? null : '由 PageFire 发布')
  const isLogoFallback = !!meta.logo_url && ogImage === meta.logo_url

  // ── OG / Twitter Card meta tags ────────────────────────────────────
  if (!hasOgTag && (ogTitle || ogImage)) {
    const tags: string[] = []
    tags.push('  <meta property="og:type" content="website" />')
    tags.push('  <meta property="og:locale" content="zh_CN" />')
    if (meta.page_url) {
      tags.push(`  <meta property="og:url" content="${escapeHtmlAttr(meta.page_url)}" />`)
    }
    if (meta.site_name) {
      tags.push(`  <meta property="og:site_name" content="${escapeHtmlAttr(meta.site_name)}" />`)
    }
    if (ogTitle) {
      tags.push(`  <meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />`)
      tags.push(`  <meta name="twitter:title" content="${escapeHtmlAttr(ogTitle)}" />`)
    }
    if (ogImage) {
      tags.push(`  <meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`)
      if (isLogoFallback) {
        tags.push('  <meta property="og:image:width" content="300" />')
        tags.push('  <meta property="og:image:height" content="98" />')
      }
      tags.push(`  <meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />`)
    }
    if (ogDesc) {
      tags.push(`  <meta property="og:description" content="${escapeHtmlAttr(ogDesc)}" />`)
      tags.push(`  <meta name="twitter:description" content="${escapeHtmlAttr(ogDesc)}" />`)
    }
    tags.push('  <meta name="twitter:card" content="summary_large_image" />')

    const block = '\n' + tags.join('\n') + '\n'
    const headIdx = result.indexOf('</head>')
    if (headIdx !== -1) {
      result = result.slice(0, headIdx) + block + result.slice(headIdx)
    }
  }

  // ── WeChat JS-SDK script tag ───────────────────────────────────────
  if (meta.wechat_app_id) {
    const wxBlock = `\n<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>\n`
    const wxHeadIdx = result.indexOf('</head>')
    if (wxHeadIdx !== -1) {
      result = result.slice(0, wxHeadIdx) + wxBlock + result.slice(wxHeadIdx)
    } else {
      const bodyIdx = result.lastIndexOf('</body>')
      if (bodyIdx !== -1) {
        result = result.slice(0, bodyIdx) + wxBlock + result.slice(bodyIdx)
      } else {
        result += wxBlock
      }
    }
  }

  // ── WeChat share card auto-config (via signature API) ──────────────
  if (meta.wechat_sign_api && (ogTitle || ogImage)) {
    const shareTitle = escapeJsStr(ogTitle || '')
    const shareDesc = escapeJsStr(ogDesc || '')
    const shareImg = escapeJsStr(ogImage || '')
    const signApi = escapeJsStr(meta.wechat_sign_api)
    const script = `
<script>
(function(){var ua=navigator.userAgent,dbg=location.search.indexOf('wx_debug=1')>=0;
if(!/MicroMessenger/i.test(ua))return;
// vConsole (only in debug mode: add ?wx_debug=1 to URL)
if(dbg){var vc=document.createElement('script');vc.src='https://unpkg.com/vconsole@3/dist/vconsole.min.js';
vc.onload=function(){window.vConsole=new window.VConsole()};
document.head.appendChild(vc)};
var log=dbg?function(m){console.log('[pf-wx]',m)}:function(){};
var warn=dbg?function(m){console.warn('[pf-wx]',m)}:function(){};
var url=location.href.split('#')[0];
log('fetching signature for:'+url);
fetch('${signApi}?url='+encodeURIComponent(url)).then(function(r){return r.json()}).then(function(res){
log('sign response:'+JSON.stringify(res));
if(res.code!==200&&res.code!==0){warn('sign failed:'+JSON.stringify(res));return}
var s=document.createElement('script');s.src='https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
s.onload=function(){log('jweixin loaded');
wx.config({debug:dbg,appId:res.data.appId,timestamp:res.data.timestamp,nonceStr:res.data.nonceStr,signature:res.data.signature,jsApiList:['updateAppMessageShareData','updateTimelineShareData']});
log('wx.config called');
wx.ready(function(){log('wx.ready');
var link=location.href.split('#')[0];
wx.updateAppMessageShareData({title:'${shareTitle}',desc:'${shareDesc}',link:link,imgUrl:'${shareImg}',success:function(){log('updateAppMessageShareData success')}});
wx.updateTimelineShareData({title:'${shareTitle}',link:link,imgUrl:'${shareImg}',success:function(){log('updateTimelineShareData success')}})});
wx.error(function(err){warn('wx.config error:'+JSON.stringify(err))})};
document.head.appendChild(s)})})();
</script>\n`
    const bodyIdx = result.lastIndexOf('</body>')
    if (bodyIdx !== -1) {
      result = result.slice(0, bodyIdx) + script + result.slice(bodyIdx)
    } else {
      result += script
    }
  }

  return result
}

function buildMetaBarParts(m: PageMeta): string[] {
  const parts: string[] = []
  if (m.author) parts.push(`<span>${m.author}</span>`)
  if (m.created_at) parts.push(`<span>${fmtDate(m.created_at)}</span>`)
  if (m.updated_at && m.updated_at !== m.created_at) parts.push(`<span>更新 ${fmtDate(m.updated_at)}</span>`)
  return parts
}

/**
 * Serve an HTML file with a view counter + metadata injected at the
 * right position depending on page type:
 *
 *   - **PageFire-generated** `.md-footer` / `.doc-footer` → meta bar below
 *     the first `<h1>` (title) + simple counter inline in the footer
 *   - **`<footer>` element** → counter block inside the footer
 *   - **Fallback** → standalone counter block before `</body>`
 *
 * The updating script is always placed just before `</body>`.
 */
export function serveHtmlWithCounter(
  res: ServerResponse,
  filePath: string,
  meta: PageMeta,
  opts: { req?: IncomingMessage; cspOverride?: string | null } = {},
): void {
  let stat: Stats
  try {
    stat = statSync(filePath)
  } catch {
    serve404(res)
    return
  }

  if (stat.size > MAX_HTML_INJECT) {
    serveFile(res, filePath, { req: opts.req, cspOverride: opts.cspOverride })
    return
  }

  // ETag from file stat only — never mix in meta.views, or the etag would
  // change on every counter POST and 304 revalidation would never fire. A
  // 304 keeps a stale painted count, which is fine: the injected script in
  // the cached body still POSTs /_pf/counter and rewrites the span.
  const etag = etagFor(stat)
  if (opts.req && etagMatches(opts.req.headers['if-none-match'], etag)) {
    for (const [k, v] of Object.entries(buildSecurityHeaders(opts.cspOverride))) res.setHeader(k, v)
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('ETag', etag)
    res.statusCode = 304
    res.end()
    return
  }

  let html: string
  try {
    html = readFileSync(filePath, 'utf8')
  } catch {
    serve404(res)
    return
  }

  // Inject OG meta tags + WeChat JS-SDK (before any counter injection)
  html = injectHeadMeta(html, meta)

  const label = meta.views.toLocaleString()
  const counterSpan = `<span id="pf-cnt">👁 ${label}</span>`
  const script = `<script>fetch('/_pf/counter',{method:'POST'}).then(function(r){return r.json()}).then(function(j){var s=document.getElementById('pf-cnt');if(s)s.textContent='\\uD83D\\uDC41 '+j.views.toLocaleString()+' views'})</script>`

  let result = html

  // ── Detect PageFire-generated pages ───────────────────────────────────
  const isPfFooter = result.includes('class="md-footer"') || result.includes('class="doc-footer"')

  if (isPfFooter) {
    // 1. Meta bar — below the first <h1> (title), after </h1>
    const articleTag = 'class="md">'
    const aIdx = result.indexOf(articleTag)
    if (aIdx !== -1) {
      const afterArticle = result.indexOf('>', aIdx) + 1
      // Find first <h1> after article opening
      const h1Start = result.indexOf('<h1', afterArticle)
      // Only inject below h1 if it's within a reasonable distance (< 2000 chars)
      if (h1Start !== -1 && h1Start - afterArticle < 2000) {
        const h1Close = result.indexOf('</h1>', h1Start)
        if (h1Close !== -1) {
          const parts = buildMetaBarParts(meta)
          parts.push(counterSpan)
          const bar = `<div style="display:flex;gap:8px 16px;flex-wrap:wrap;font:13.5px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:.01em;color:var(--muted,#59636e);padding:3px 0 8px;margin:0 0 14px;border-bottom:1px solid var(--bdr,#d1d9e0)">${parts.join('')}</div>`
          result = result.slice(0, h1Close + 5) + '\n' + bar + result.slice(h1Close + 5)
        }
      }
    }
    // 2. Footer — keep original branding, just append counter span inline
    for (const cls of ['class="md-footer">', 'class="doc-footer">']) {
      const idx = result.indexOf(cls)
      if (idx !== -1) {
        const closeDiv = result.indexOf('</div>', idx + cls.length)
        if (closeDiv !== -1) {
          result = result.slice(0, closeDiv) + ` · ${counterSpan}` + result.slice(closeDiv)
          break
        }
      }
    }
  } else {
    // ── Non-PageFire pages: inject counter in footer area ───────────────
    let injected = false

    // 1. Any <footer> element
    const fm = result.match(/<footer[\s>]/i)
    if (fm) {
      const endFooter = result.toLowerCase().indexOf('</footer>', fm.index!)
      if (endFooter !== -1) {
        result = result.slice(0, endFooter) +
          `<div style="text-align:center;font:12px/1.5 system-ui,sans-serif;color:#999;padding:2px 0 4px">${counterSpan}</div>\n` +
          result.slice(endFooter)
        injected = true
      }
    }

    // 2. Element with "footer" in class/id
    if (!injected) {
      const elemMatch = result.match(/<(div|section|aside)\s+[^>"]*"(?:[^"]*)?footer(?:[^"]*)?"[^>]*>/i)
      if (elemMatch) {
        const closeDiv = result.indexOf('</div>', elemMatch.index! + elemMatch[0].length)
        if (closeDiv !== -1) {
          result = result.slice(0, closeDiv) + `\n<div style="text-align:center;font:12px/1.5 system-ui,sans-serif;color:#999">${counterSpan}</div>` + result.slice(closeDiv)
          injected = true
        }
      }
    }

    // 3. Fallback: standalone block before </body>
    if (!injected) {
      const bodyIdx = result.lastIndexOf('</body>')
      const block = `<div style="display:block;text-align:center;padding:6px 4px 16px;font:12px/1.5 system-ui,-apple-system,sans-serif;color:#999;letter-spacing:.01em">${counterSpan}</div>`
      if (bodyIdx !== -1) {
        result = result.slice(0, bodyIdx) + block + result.slice(bodyIdx)
      } else {
        result += block
      }
    }
  }

  // ── Script: always before </body> ──────────────────────────────────────
  const bodyIdx = result.lastIndexOf('</body>')
  if (bodyIdx !== -1) {
    result = result.slice(0, bodyIdx) + script + result.slice(bodyIdx)
  } else {
    result += script
  }

  const buf = Buffer.from(result, 'utf8')
  const headers = buildSecurityHeaders(opts.cspOverride)
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('ETag', etag)
  res.setHeader('Vary', 'Accept-Encoding')

  // The injected body is dynamic (views count in the span), so gzip runs per
  // request with no cache — bounded work since this path only sees ≤2MB pages
  // on browser cache misses.
  let body: Buffer = buf
  if (buf.length >= MIN_GZ_BYTES && acceptsGzip(opts.req?.headers['accept-encoding'] as string | undefined)) {
    body = gzipSync(buf, { level: 6 })
    res.setHeader('Content-Encoding', 'gzip')
  }
  res.setHeader('Content-Length', body.length)
  res.statusCode = 200
  res.end(body)
}

export function serve401(res: ServerResponse): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  res.writeHead(401, {
    'Content-Type': 'text/html; charset=utf-8',
    'WWW-Authenticate': 'Bearer realm="PageFire"',
  })
  res.end(
    '<!doctype html><html><body><h1>401 Unauthorized</h1><p>This page is password protected. Supply passphrase via X-Passphrase header.</p></body></html>',
  )
}
