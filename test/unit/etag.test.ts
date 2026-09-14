import { describe, it, expect } from 'vitest'
import { etagMatches, parseRange, acceptsGzip, isCompressible } from '../../src/http/serve.js'

describe('etagMatches', () => {
  const etag = 'W/"1200-1720000000000"'
  it('returns false for missing header', () => { expect(etagMatches(undefined, etag)).toBe(false) })
  it('returns false for empty header', () => { expect(etagMatches('', etag)).toBe(false) })
  it('matches identical weak etag', () => { expect(etagMatches(etag, etag)).toBe(true) })
  it('weak-compares strong etag against weak etag', () => {
    expect(etagMatches('"1200-1720000000000"', etag)).toBe(true)
  })
  it('matches within a comma list', () => {
    expect(etagMatches('W/"9-1", W/"1200-1720000000000"', etag)).toBe(true)
  })
  it('matches wildcard', () => { expect(etagMatches('*', etag)).toBe(true) })
  it('tolerates whitespace', () => { expect(etagMatches(' W/"1200-1720000000000" ', etag)).toBe(true) })
  it('rejects mismatched opaque part', () => { expect(etagMatches('W/"1-2"', etag)).toBe(false) })
})

describe('parseRange', () => {
  it('parses bounded range', () => { expect(parseRange('bytes=0-4', 100)).toEqual({ start: 0, end: 4 }) })
  it('parses open-ended range', () => { expect(parseRange('bytes=5-', 100)).toEqual({ start: 5, end: 99 }) })
  it('parses suffix range', () => { expect(parseRange('bytes=-100', 100)).toEqual({ start: 0, end: 99 }) })
  it('clamps suffix larger than size', () => { expect(parseRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 }) })
  it('clamps end to size-1', () => { expect(parseRange('bytes=90-200', 100)).toEqual({ start: 90, end: 99 }) })
  it('rejects zero-length suffix', () => { expect(parseRange('bytes=-0', 100)).toBe('invalid') })
  it('rejects start beyond size', () => { expect(parseRange('bytes=100-', 100)).toBe('invalid') })
  it('rejects start beyond size (bounded)', () => { expect(parseRange('bytes=150-160', 100)).toBe('invalid') })
  it('returns null for multi-range (serve full)', () => { expect(parseRange('bytes=0-9,20-29', 100)).toBeNull() })
  it('returns null for missing header', () => { expect(parseRange(undefined, 100)).toBeNull() })
  it('returns null for non-bytes unit', () => { expect(parseRange('items=0-4', 100)).toBeNull() })
  it('returns null for garbage', () => { expect(parseRange('bytes=abc', 100)).toBeNull() })
  it('returns null for bare bytes=', () => { expect(parseRange('bytes=', 100)).toBeNull() })
})

describe('acceptsGzip', () => {
  it('returns false for missing header', () => { expect(acceptsGzip(undefined)).toBe(false) })
  it('accepts plain gzip', () => { expect(acceptsGzip('gzip')).toBe(true) })
  it('accepts gzip in a list', () => { expect(acceptsGzip('deflate, gzip, br')).toBe(true) })
  it('is case-insensitive', () => { expect(acceptsGzip('GZIP')).toBe(true) })
  it('rejects when gzip absent', () => { expect(acceptsGzip('deflate, br')).toBe(false) })
  it('rejects gzip with q=0', () => { expect(acceptsGzip('gzip;q=0')).toBe(false) })
  it('accepts gzip with nonzero q', () => { expect(acceptsGzip('gzip;q=0.5')).toBe(true) })
})

describe('isCompressible', () => {
  it('marks html compressible', () => { expect(isCompressible('.html')).toBe(true) })
  it('marks js compressible', () => { expect(isCompressible('.js')).toBe(true) })
  it('marks mjs compressible', () => { expect(isCompressible('.mjs')).toBe(true) })
  it('marks svg compressible', () => { expect(isCompressible('.svg')).toBe(true) })
  it('marks xml compressible', () => { expect(isCompressible('.xml')).toBe(true) })
  it('marks png incompressible', () => { expect(isCompressible('.png')).toBe(false) })
  it('marks mp4 incompressible', () => { expect(isCompressible('.mp4')).toBe(false) })
  it('marks woff2 incompressible', () => { expect(isCompressible('.woff2')).toBe(false) })
})
