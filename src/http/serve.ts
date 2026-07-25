import { createReadStream, statSync, existsSync, readFileSync } from 'fs'
import { extname } from 'path'
import type { ServerResponse } from 'http'
import { SECURITY_HEADERS } from './headers.js'
import { sanitizeSvg } from '../core/svg.js'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  '.pps': 'application/vnd.ms-powerpoint',
}

export function serveFile(res: ServerResponse, filePath: string, forceDownload = false): void {
  if (!existsSync(filePath)) {
    serve404(res)
    return
  }
  const ext = extname(filePath).toLowerCase()

  if (ext === '.svg') {
    try {
      const raw = readFileSync(filePath, 'utf8')
      const clean = sanitizeSvg(raw)
      if (!clean) {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('Content-Disposition', 'attachment; filename="image.svg"')
        res.statusCode = 200
        res.end(Buffer.from(raw))
        return
      }
      const buf = Buffer.from(clean, 'utf8')
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Content-Length', buf.length)
      res.statusCode = 200
      res.end(buf)
      return
    } catch {
      serve404(res)
      return
    }
  }

  const mime = MIME[ext] ?? 'application/octet-stream'
  const stat = statSync(filePath)
  if (stat.isDirectory()) { serve404(res); return }   // never stream a directory → would throw EISDIR

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  res.setHeader('Content-Type', mime)
  res.setHeader('Content-Length', stat.size)
  if (forceDownload) res.setHeader('Content-Disposition', 'attachment')
  res.statusCode = 200
  const stream = createReadStream(filePath)
  // A stream 'error' with no listener is fatal (uncaughtException → process crash). Handle it.
  stream.on('error', (err) => {
    console.error('[serve] stream error:', err)
    if (!res.headersSent) { res.statusCode = 404; res.end('Not Found') }
    else res.destroy()
  })
  stream.pipe(res)
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
  og_image?: string | null
  wechat_app_id?: string | null
  logo_url?: string           // platform logo for fallback
  page_url?: string           // full URL of this page (e.g. https://mysite.pagefire.openhkt.com/)
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  let result = html

  // ── OG / Twitter Card meta tags ────────────────────────────────────
  // Skip OG injection if the page already defines its own OG tags
  const hasOgTag = /<meta\s+[^>]*property="og:/i.test(result)
  if (!hasOgTag) {
    // Resolve values: explicit → auto-detect from HTML → platform logo fallback
    const ogTitle = meta.title || extractTitle(result) || null
    const rawImage = meta.og_image || extractFirstImage(result) || meta.logo_url || null
    const ogImage = rawImage ? resolveOgImageUrl(rawImage, meta.page_url) : null
    const ogDesc = meta.author ? `由 ${meta.author} 发布` : null

    if (ogTitle || ogImage) {
      const tags: string[] = []
      tags.push('  <meta property="og:type" content="website" />')
      tags.push('  <meta property="og:locale" content="zh_CN" />')
      if (meta.page_url) {
        tags.push(`  <meta property="og:url" content="${escapeHtmlAttr(meta.page_url)}" />`)
      }
      if (ogTitle) {
        tags.push(`  <meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />`)
        tags.push(`  <meta name="twitter:title" content="${escapeHtmlAttr(ogTitle)}" />`)
      }
      if (ogImage) {
        tags.push(`  <meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`)
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
  }

  // ── WeChat JS-SDK ──────────────────────────────────────────────────
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
): void {
  if (!existsSync(filePath)) { serve404(res); return }

  const stat = statSync(filePath)
  if (stat.size > MAX_HTML_INJECT) {
    serveFile(res, filePath)
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
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Length', buf.length)
  res.statusCode = 200
  res.end(buf)
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
