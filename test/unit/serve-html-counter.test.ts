import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Writable } from 'stream'
import { gunzipSync } from 'zlib'
import { serveHtmlWithCounter } from '../../src/http/serve.js'

interface FakeRes extends Writable {
  headers: Record<string, unknown>
  statusCode: number
  chunks: Buffer[]
  finished: boolean
}

function fakeRes(): FakeRes {
  const chunks: Buffer[] = []
  const res: any = new Writable({ write(c: Buffer, _enc, cb) { chunks.push(c); cb() } })
  res.chunks = chunks
  res.headers = {}
  res.statusCode = 0
  res.finished = false
  res.setHeader = (k: string, v: unknown) => { res.headers[k.toLowerCase()] = v }
  res.writeHead = (code: number, h?: Record<string, string>) => {
    res.statusCode = code
    if (h) for (const [k, v] of Object.entries(h)) res.headers[k.toLowerCase()] = v
  }
  const origEnd = res.end.bind(res)
  res.end = (b?: Buffer | string) => {
    if (b) chunks.push(Buffer.from(b))
    res.finished = true
    return origEnd()
  }
  return res
}

const reqWith = (headers: Record<string, string>) => ({ headers }) as any
const bodyOf = (res: FakeRes) => Buffer.concat(res.chunks)
const meta = { views: 41 }

let dir: string
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'pf-html-'))
  writeFileSync(join(dir, 'page.html'), '<html><head><title>t</title></head><body><p>hello world content</p></body></html>')
  writeFileSync(join(dir, 'huge.html'), Buffer.from('<html><body>' + 'x'.repeat(2 * 1024 * 1024) + '</body></html>'))
})

afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

describe('serveHtmlWithCounter', () => {
  it('injects the counter span and keeps CL = body length', async () => {
    const res = fakeRes()
    serveHtmlWithCounter(res, join(dir, 'page.html'), meta)
    expect(res.finished).toBe(true)
    expect(res.statusCode).toBe(200)
    const body = bodyOf(res).toString()
    expect(body).toContain('pf-cnt')
    expect(body).toContain('<title>t</title>')
    expect(Number(res.headers['content-length'])).toBe(bodyOf(res).length)
  })

  it('304s on If-None-Match even when meta.views changed (accepted staleness — script self-heals)', async () => {
    const first = fakeRes()
    serveHtmlWithCounter(first, join(dir, 'page.html'), meta)
    const etag = first.headers.etag as string
    expect(etag).toBeTruthy()

    const res = fakeRes()
    serveHtmlWithCounter(res, join(dir, 'page.html'), { views: meta.views + 999 }, { req: reqWith({ 'if-none-match': etag }) })
    expect(res.statusCode).toBe(304)
    expect(res.headers['content-length']).toBeUndefined()
    expect(res.headers['content-type']).toBeUndefined()
    expect(bodyOf(res).length).toBe(0)
  })

  it('gzips the injected body on demand (no cache) with CL = gz length', async () => {
    const res = fakeRes()
    serveHtmlWithCounter(res, join(dir, 'page.html'), meta, { req: reqWith({ 'accept-encoding': 'gzip' }) })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(res.headers.vary).toBe('Accept-Encoding')
    const body = bodyOf(res)
    expect(Number(res.headers['content-length'])).toBe(body.length)
    const html = gunzipSync(body).toString()
    expect(html).toContain('pf-cnt')
  })

  it('delegates >2MB HTML to serveFile: no injection, but ETag + no-cache still apply', async () => {
    const res = fakeRes()
    serveHtmlWithCounter(res, join(dir, 'huge.html'), meta)
    // >2MB streams raw via serveFile — completion is asynchronous
    for (let i = 0; i < 100 && !res.finished; i++) await new Promise(r => setTimeout(r, 10))
    expect(res.finished).toBe(true)
    expect(res.statusCode).toBe(200)
    expect(String(bodyOf(res))).not.toContain('pf-cnt')
    expect(res.headers.etag).toBeTruthy()
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(Number(res.headers['content-length'])).toBe(bodyOf(res).length)
  })

  it('404s a missing file', () => {
    const res = fakeRes()
    serveHtmlWithCounter(res, join(dir, 'nope.html'), meta)
    expect(res.statusCode).toBe(404)
  })
})
