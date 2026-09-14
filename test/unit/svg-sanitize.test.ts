import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { sanitizeSvg, sanitizeSvgCached } from '../../src/core/svg.js'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'

describe('sanitizeSvg (characterization — guards the singleton refactor)', () => {
  it('strips <script>', () => {
    const out = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>')
    expect(out).not.toContain('<script')
  })
  it('strips onload attribute', () => {
    const out = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>')
    expect(out).not.toContain('onload')
  })
  it('preserves basic svg content', () => {
    const out = sanitizeSvg(SVG)
    expect(out).toContain('<svg')
    expect(out).toContain('<rect')
  })
  it('returns null for empty input', () => {
    expect(sanitizeSvg('')).toBeNull()
  })
})

describe('sanitizeSvgCached', () => {
  let dir: string
  beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'pf-svg-')) })
  afterAll(() => { rmSync(dir, { recursive: true, force: true }) })

  const writeAt = (p: string, content: string, mtimeMs: number) => {
    writeFileSync(p, content)
    utimesSync(p, mtimeMs / 1000, mtimeMs / 1000)
  }

  it('sanitizes file content', () => {
    const p = join(dir, 'a.svg')
    writeAt(p, `<svg xmlns="http://www.w3.org/2000/svg"><script>x</script><title>t1</title></svg>`, 1000)
    const out = sanitizeSvgCached(p, { mtimeMs: 1000 })
    expect(out).toContain('<title>t1</title>')
    expect(out).not.toContain('<script')
  })

  it('memo hits while mtime is unchanged (even if content secretly changes)', () => {
    const p = join(dir, 'b.svg')
    writeAt(p, `<svg xmlns="http://www.w3.org/2000/svg"><title>v1</title></svg>`, 2000)
    const first = sanitizeSvgCached(p, { mtimeMs: 2000 })
    // content changes but mtime is pinned — the memo must still serve the old clean output
    writeAt(p, `<svg xmlns="http://www.w3.org/2000/svg"><title>v2</title></svg>`, 2000)
    const second = sanitizeSvgCached(p, { mtimeMs: 2000 })
    expect(second).toBe(first)
  })

  it('re-sanitizes after mtime change', () => {
    const p = join(dir, 'c.svg')
    writeAt(p, `<svg xmlns="http://www.w3.org/2000/svg"><title>v1</title></svg>`, 3000)
    sanitizeSvgCached(p, { mtimeMs: 3000 })
    writeAt(p, `<svg xmlns="http://www.w3.org/2000/svg"><title>v2</title></svg>`, 4000)
    const out = sanitizeSvgCached(p, { mtimeMs: 4000 })
    expect(out).toContain('v2')
    expect(out).not.toContain('v1')
  })

  it('bypasses the memo for oversized inputs (>256KB)', () => {
    const p = join(dir, 'big.svg')
    const big = (marker: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><!--${'x'.repeat(300 * 1024)}--><title>${marker}</title></svg>`
    writeAt(p, big('v1'), 5000)
    const first = sanitizeSvgCached(p, { mtimeMs: 5000 })
    expect(first).toContain('v1')
    // content changes with pinned mtime — oversized inputs are never memoized, so new content shows up
    writeAt(p, big('v2'), 5000)
    const second = sanitizeSvgCached(p, { mtimeMs: 5000 })
    expect(second).toContain('v2')
    expect(second).not.toBe(first)
  })

  it('returns null for missing file', () => {
    expect(sanitizeSvgCached(join(dir, 'nope.svg'), { mtimeMs: 1 })).toBeNull()
  })
})
