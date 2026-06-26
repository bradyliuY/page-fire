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
