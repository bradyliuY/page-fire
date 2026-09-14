import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { resolveServePath, serveSite404 } from '../../src/http/serve.js'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'pf-resolve-'))
  // site shape: index.html + dashboard/index.html + empty-dir/ + assets/logo.png
  writeFileSync(join(dir, 'index.html'), '<html>root</html>')
  mkdirSync(join(dir, 'dashboard'))
  writeFileSync(join(dir, 'dashboard', 'index.html'), '<html>dashboard</html>')
  mkdirSync(join(dir, 'empty-dir'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'assets', 'logo.png'), 'png')
})

afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

describe('resolveServePath', () => {
  it('resolves a direct file hit', () => {
    const r = resolveServePath(dir, 'assets/logo.png', false)
    expect(r.found).toBe(true)
    expect(r.filePath).toBe(join(dir, 'assets', 'logo.png'))
  })

  it('maps a bare directory to its index.html (Next/Hugo export form)', () => {
    const r = resolveServePath(dir, 'dashboard', false)
    expect(r.found).toBe(true)
    expect(r.filePath).toBe(join(dir, 'dashboard', 'index.html'))
  })

  it('maps a trailing-slash directory to its index.html', () => {
    const r = resolveServePath(dir, 'dashboard/', false)
    expect(r.found).toBe(true)
    expect(r.filePath).toBe(join(dir, 'dashboard', 'index.html'))
  })

  it('does NOT spa-fall-through a directory without index.html', () => {
    const r = resolveServePath(dir, 'empty-dir', true)
    expect(r.found).toBe(false)
    expect(r.filePath).toBeNull()
  })

  it('returns not-found for a missing path with spa off', () => {
    const r = resolveServePath(dir, 'no-such-path', false)
    expect(r.found).toBe(false)
  })

  it('spa-falls-back a missing extensionless path to the root shell', () => {
    const r = resolveServePath(dir, 'some/route', true)
    expect(r.found).toBe(true)
    expect(r.filePath).toBe(join(dir, 'index.html'))
  })

  it('spa-falls-back a missing .html path to the root shell', () => {
    const r = resolveServePath(dir, 'some/route.html', true)
    expect(r.found).toBe(true)
    expect(r.filePath).toBe(join(dir, 'index.html'))
  })

  it('never spa-falls-back asset extensions', () => {
    const r = resolveServePath(dir, 'missing.png', true)
    expect(r.found).toBe(false)
  })

  it('does not spa-fall-back when the root shell is missing', () => {
    const r = resolveServePath(dir, 'assets', true) // exists as dir without index → not found
    expect(r.found).toBe(false)
    const missing = resolveServePath(join(dir, 'nope'), 'anything', true) // deployDir itself missing
    expect(missing.found).toBe(false)
  })
})

describe('serveSite404', () => {
  function fakeRes() {
    const headers: Record<string, unknown> = {}
    return {
      headers,
      statusCode: 0,
      body: undefined as unknown,
      setHeader(k: string, v: unknown) { headers[k.toLowerCase()] = v },
      end(b?: unknown) { this.body = b },
      writeHead(code: number) { this.statusCode = code },
    } as any
  }

  it('serves the site 404.html with status 404 and no-cache', () => {
    writeFileSync(join(dir, '404.html'), '<html>custom 404</html>')
    const res = fakeRes()
    serveSite404(res, dir)
    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.headers['content-length']).toBe(Buffer.byteLength('<html>custom 404</html>'))
    expect(String(res.body)).toContain('custom 404')
  })

  it('falls back to the platform 404 when the site has no 404.html', () => {
    const res = fakeRes()
    serveSite404(res, join(dir, 'no-such-dir'))
    expect(res.statusCode).toBe(404)
    expect(String(res.body)).toContain('404 Not Found')
  })
})
