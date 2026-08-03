import { describe, it, expect } from 'vitest'
import {
  sessionKey, signSessionToken, verifySessionToken, parseSessionCookie,
  buildSetCookie, buildClearCookie, SESSION_MAX_AGE,
} from '../../src/http/session.js'

const KEY = sessionKey('test-secret')
const NOW = 1_750_000_000_000

describe('session cookie sign/verify', () => {
  it('round-trips a valid token', () => {
    const token = signSessionToken('abc123', KEY, NOW)
    expect(verifySessionToken(token, 'abc123', KEY, NOW + 1000)).toBe(true)
  })

  it('rejects a token for a different did', () => {
    const token = signSessionToken('abc123', KEY, NOW)
    expect(verifySessionToken(token, 'other', KEY, NOW + 1000)).toBe(false)
  })

  it('rejects a tampered token', () => {
    const token = signSessionToken('abc123', KEY, NOW)
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
    expect(verifySessionToken(flipped, 'abc123', KEY, NOW + 1000)).toBe(false)
  })

  it('rejects an expired token', () => {
    const token = signSessionToken('abc123', KEY, NOW)
    const past = NOW + SESSION_MAX_AGE * 1000 + 1000
    expect(verifySessionToken(token, 'abc123', KEY, past)).toBe(false)
  })

  it('rejects a token signed with a different key', () => {
    const token = signSessionToken('abc123', KEY, NOW)
    expect(verifySessionToken(token, 'abc123', sessionKey('other-secret'), NOW + 1000)).toBe(false)
  })

  it('rejects garbage / empty input', () => {
    expect(verifySessionToken(undefined, 'abc123', KEY, NOW)).toBe(false)
    expect(verifySessionToken('not-a-token', 'abc123', KEY, NOW)).toBe(false)
    expect(verifySessionToken('', 'abc123', KEY, NOW)).toBe(false)
  })

  it('parseSessionCookie extracts the pf_auth value', () => {
    expect(parseSessionCookie('other=x; pf_auth=TOKEN; foo=y')).toBe('TOKEN')
    expect(parseSessionCookie('pf_auth=only')).toBe('only')
    expect(parseSessionCookie(undefined)).toBeUndefined()
    expect(parseSessionCookie('no-such-cookie=1')).toBeUndefined()
  })

  it('buildSetCookie / buildClearCookie have the expected shape', () => {
    const set = buildSetCookie('abc123', KEY, true)
    expect(set).toMatch(/^pf_auth=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=\d+$/)
    const clear = buildClearCookie(false)
    expect(clear).toMatch(/^pf_auth=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0$/)
  })
})
