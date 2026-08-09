import { describe, it, expect } from 'vitest'
import { SECURITY_HEADERS, buildSecurityHeaders, enforceMinimumCsp } from '../../src/http/headers.js'
import { validateContentSecurityPolicy, ValidationError } from '../../src/core/validate.js'

describe('default CSP', () => {
  const csp = SECURITY_HEADERS['Content-Security-Policy']

  it('allows inline + https scripts with unsafe-eval (map SDKs)', () => {
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https:")
  })
  it('allows external stylesheets and fonts', () => {
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https:")
    expect(csp).toContain("font-src 'self' data: https:")
  })
  it('allows workers from self/blob/https (AMap tile rendering)', () => {
    expect(csp).toContain("worker-src 'self' blob: https:")
  })
  it('allows iframes and media over https', () => {
    expect(csp).toContain("frame-src 'self' https:")
    expect(csp).toContain("media-src 'self' https:")
  })
  it('allows images and connect over https', () => {
    expect(csp).toContain("img-src 'self' data: blob: https:")
    expect(csp).toContain("connect-src 'self' https:")
  })
})

describe('buildSecurityHeaders', () => {
  it('returns the default headers when no override is given', () => {
    expect(buildSecurityHeaders()).toBe(SECURITY_HEADERS)
    expect(buildSecurityHeaders(null)).toBe(SECURITY_HEADERS)
  })

  it('keeps user directives and enforces the platform minimum', () => {
    const h = buildSecurityHeaders("default-src 'self'; connect-src 'self' https://api.example.com")
    const csp = h['Content-Security-Policy']
    expect(csp).toContain("connect-src 'self' https://api.example.com")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('mirrors default-src sources when a required directive is absent', () => {
    const h = buildSecurityHeaders("default-src 'self'")
    expect(h['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline'")
  })

  it('appends missing tokens without duplicating existing ones', () => {
    expect(enforceMinimumCsp("script-src 'self' 'unsafe-inline'")).toBe("script-src 'self' 'unsafe-inline'")
    expect(enforceMinimumCsp("script-src 'self' https:")).toBe("script-src 'self' https: 'unsafe-inline'")
  })

  it('does not force a directive when neither it nor default-src exists', () => {
    expect(enforceMinimumCsp("connect-src 'self'")).toBe("connect-src 'self'")
  })

  it('never throws on header-hostile control characters', () => {
    expect(() => buildSecurityHeaders("default-src 'self'\nconnect-src 'self'")).not.toThrow()
  })
})

describe('validateContentSecurityPolicy', () => {
  it('accepts null / undefined / empty', () => {
    expect(() => validateContentSecurityPolicy(null)).not.toThrow()
    expect(() => validateContentSecurityPolicy(undefined)).not.toThrow()
    expect(() => validateContentSecurityPolicy('')).not.toThrow()
  })

  it('accepts a well-formed policy', () => {
    expect(() => validateContentSecurityPolicy("default-src 'self'; connect-src 'self' https://api.example.com")).not.toThrow()
  })

  it('rejects control characters', () => {
    expect(() => validateContentSecurityPolicy("default-src 'self'\nconnect-src 'self'")).toThrow(ValidationError)
    expect(() => validateContentSecurityPolicy("default-src 'self'\x00x")).toThrow(ValidationError)
  })

  it('rejects overly long policies', () => {
    expect(() => validateContentSecurityPolicy('a'.repeat(2001))).toThrow(ValidationError)
    expect(() => validateContentSecurityPolicy('a'.repeat(2000))).not.toThrow()
  })
})
