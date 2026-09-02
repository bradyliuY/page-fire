import { describe, expect, test } from 'vitest'
import { resolveBaseDomain } from '../../src/http/base-domain.js'
import { parseBaseDomains } from '../../src/config.js'

const DOMAINS = ['pagefire.openhkt.com', 'pagefire.hkting.com']

describe('resolveBaseDomain', () => {
  test('returns the apex when host equals a configured domain', () => {
    expect(resolveBaseDomain('pagefire.openhkt.com', DOMAINS)).toBe('pagefire.openhkt.com')
    expect(resolveBaseDomain('pagefire.hkting.com', DOMAINS)).toBe('pagefire.hkting.com')
  })

  test('returns the owning domain for a subdomain host', () => {
    expect(resolveBaseDomain('abc-12345678.pagefire.openhkt.com', DOMAINS)).toBe('pagefire.openhkt.com')
    expect(resolveBaseDomain('demo-ylfupykx.pagefire.hkting.com', DOMAINS)).toBe('pagefire.hkting.com')
  })

  test('is case-insensitive (Host header case)', () => {
    expect(resolveBaseDomain('ABC-12345678.PAGEFIRE.HKTING.COM', DOMAINS)).toBe('pagefire.hkting.com')
  })

  test('returns null for unrelated hosts and suffix tricks', () => {
    expect(resolveBaseDomain('example.com', DOMAINS)).toBeNull()
    expect(resolveBaseDomain('pagefire.openhkt.com.evil.io', DOMAINS)).toBeNull()
    expect(resolveBaseDomain('notpagefire.openhkt.com', DOMAINS)).toBeNull()
  })

  test('returns null for empty host or empty domain list', () => {
    expect(resolveBaseDomain('', DOMAINS)).toBeNull()
    expect(resolveBaseDomain('pagefire.openhkt.com', [])).toBeNull()
  })
})

describe('parseBaseDomains', () => {
  test('splits a comma-separated list', () => {
    expect(parseBaseDomains('pagefire.openhkt.com,pagefire.hkting.com')).toEqual(DOMAINS)
  })

  test('trims whitespace and lowercases entries', () => {
    expect(parseBaseDomains(' PageFire.OpenHKT.com , pagefire.hkting.com ')).toEqual(DOMAINS)
  })

  test('keeps a single domain as a one-entry list', () => {
    expect(parseBaseDomains('localhost')).toEqual(['localhost'])
  })

  test('drops empty segments and duplicates, preserving order', () => {
    expect(parseBaseDomains('a.com,,b.com,a.com')).toEqual(['a.com', 'b.com'])
  })

  test('returns an empty list for an empty string', () => {
    expect(parseBaseDomains('')).toEqual([])
  })
})
