import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Writable } from 'stream'
import { gzipSync, gunzipSync } from 'zlib'
import { serveFile } from '../../src/http/serve.js'

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

async function serve(res: FakeRes, ...args: Parameters<typeof serveFile>) {
  serveFile(res, ...args)
  // stream branches finish asynchronously; wait for end() in all cases
  for (let i = 0; i < 100 && !res.finished; i++) await new Promise(r => setTimeout(r, 10))
}

let dir: string
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'pf-serve-'))
  const twoKB = (seed: string) => (seed + ' lorem-ipsum-dolor-sit-amet-consectetur ').repeat(40)
  writeFileSync(join(dir, 'app.js'), Buffer.from(twoKB('console.log(1)')))
  writeFileSync(join(dir, 'style.css'), Buffer.from(twoKB('body{color:red}')))
  writeFileSync(join(dir, 'index.html'), Buffer.from(twoKB('<html><body>hi</body></html>')))
  writeFileSync(join(dir, 'video.mp4'), Buffer.alloc(100, 7))
  writeFileSync(join(dir, 'data.xyz'), Buffer.alloc(500, 1))
  writeFileSync(join(dir, 'tiny.txt'), Buffer.from('hello'))
  mkdirSync(join(dir, 'subdir'))
})

afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

describe('serveFile — basic 200s', () => {
  it('sets cache headers + ETag + exact Content-Length on assets', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'data.xyz'))
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/octet-stream')
    expect(res.headers['cache-control']).toBe('public, max-age=300, stale-while-revalidate=86400')
    expect(res.headers.etag).toBeTruthy()
    const body = Buffer.concat(res.chunks)
    expect(Number(res.headers['content-length'])).toBe(body.length)
  })

  it('serves .mp4 with video/mp4 and Accept-Ranges', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'video.mp4'))
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('video/mp4')
    expect(res.headers['accept-ranges']).toBe('bytes')
  })

  it('marks HTML no-cache', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'index.html'))
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.headers.etag).toBeTruthy()
  })

  it('404s a directory', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'subdir'))
    expect(res.statusCode).toBe(404)
    expect(String(Buffer.concat(res.chunks))).toContain('404 Not Found')
  })
})

describe('serveFile — conditional requests', () => {
  it('304s on If-None-Match without body, CT or CL', async () => {
    const first = fakeRes()
    await serve(first, join(dir, 'video.mp4'))
    const etag = first.headers.etag as string

    const res = fakeRes()
    await serve(res, join(dir, 'video.mp4'), { req: reqWith({ 'if-none-match': etag }) })
    expect(res.statusCode).toBe(304)
    expect(res.headers['content-length']).toBeUndefined()
    expect(res.headers['content-type']).toBeUndefined()
    expect(res.headers.etag).toBe(etag)
    expect(Buffer.concat(res.chunks).length).toBe(0)
  })

  it('304s gzipped-capable requests too, with Vary', async () => {
    const first = fakeRes()
    await serve(first, join(dir, 'app.js'))
    const etag = first.headers.etag as string

    const res = fakeRes()
    await serve(res, join(dir, 'app.js'), { req: reqWith({ 'if-none-match': etag, 'accept-encoding': 'gzip' }) })
    expect(res.statusCode).toBe(304)
    expect(res.headers.vary).toBe('Accept-Encoding')
    expect(res.headers['content-encoding']).toBeUndefined()
  })
})

describe('serveFile — gzip', () => {
  it('gzips compressible files, byte-equal after gunzip, CL = gz length', async () => {
    const raw = await (async () => { const r = fakeRes(); await serve(r, join(dir, 'app.js')); return Buffer.concat(r.chunks) })()
    const res = fakeRes()
    await serve(res, join(dir, 'app.js'), { req: reqWith({ 'accept-encoding': 'gzip' }) })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(res.headers.vary).toBe('Accept-Encoding')
    const body = Buffer.concat(res.chunks)
    expect(Number(res.headers['content-length'])).toBe(body.length)
    expect(body.length).toBeLessThan(raw.length)
    expect(gunzipSync(body).equals(raw)).toBe(true)
  })

  it('sets Vary on identity responses of compressible types', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'style.css'))
    expect(res.headers['content-encoding']).toBeUndefined()
    expect(res.headers.vary).toBe('Accept-Encoding')
  })

  it('invalidates gz cache on mtime change', async () => {
    const p = join(dir, 'cached.js')
    writeFileSync(p, Buffer.from('v1 '.repeat(700)))
    const r1 = fakeRes()
    await serve(r1, p, { req: reqWith({ 'accept-encoding': 'gzip' }) })
    const v1 = gunzipSync(Buffer.concat(r1.chunks)).toString()

    writeFileSync(p, Buffer.from('v2-completely-different '.repeat(700)))
    utimesSync(p, 2000, 2000) // content + mtime both change
    const r2 = fakeRes()
    await serve(r2, p, { req: reqWith({ 'accept-encoding': 'gzip' }) })
    const v2 = gunzipSync(Buffer.concat(r2.chunks)).toString()

    expect(v2).not.toBe(v1)
    expect(v2).toContain('v2-completely-different')
  })
})

describe('serveFile — Range', () => {
  it('206s a bounded range with Content-Range and sliced body', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'video.mp4'), { req: reqWith({ range: 'bytes=0-4' }) })
    expect(res.statusCode).toBe(206)
    expect(res.headers['content-range']).toBe('bytes 0-4/100')
    expect(Number(res.headers['content-length'])).toBe(5)
    expect(Buffer.concat(res.chunks).length).toBe(5)
  })

  it('416s an unsatisfiable range', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'video.mp4'), { req: reqWith({ range: 'bytes=999-' }) })
    expect(res.statusCode).toBe(416)
    expect(res.headers['content-range']).toBe('bytes */100')
  })

  it('prefers identity 206 over gzip when both requested', async () => {
    const res = fakeRes()
    await serve(res, join(dir, 'app.js'), { req: reqWith({ range: 'bytes=0-4', 'accept-encoding': 'gzip' }) })
    expect(res.statusCode).toBe(206)
    expect(res.headers['content-encoding']).toBeUndefined()
    expect(Buffer.concat(res.chunks).length).toBe(5)
  })
})

describe('serveFile — SVG', () => {
  it('serves sanitized svg without range/gzip headers interference', async () => {
    const p = join(dir, 'icon.svg')
    writeFileSync(p, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>')
    const res = fakeRes()
    await serve(res, p)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/svg+xml')
    expect(String(Buffer.concat(res.chunks))).toContain('<rect')
    expect(res.headers['accept-ranges']).toBeUndefined()
  })

  it('falls back to raw attachment when sanitizing yields nothing', async () => {
    const p = join(dir, 'broken.svg')
    writeFileSync(p, '<script>alert(1)</script>') // sanitizes to empty → null
    const res = fakeRes()
    await serve(res, p)
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toContain('attachment')
  })
})
