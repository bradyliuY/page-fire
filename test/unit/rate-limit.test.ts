import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRateLimiter } from '../../src/mcp/rate-limit.js'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => { vi.useRealTimers() })

  it('allows up to the limit within the window', () => {
    const check = createRateLimiter()
    expect(() => {
      check('tok', 3)
      check('tok', 3)
      check('tok', 3)
    }).not.toThrow()
  })

  it('rejects the request past the limit with a RATE_LIMITED code', () => {
    const check = createRateLimiter()
    check('tok', 2)
    check('tok', 2)

    let thrown: any
    try { check('tok', 2) } catch (e) { thrown = e }
    expect(thrown?.code).toBe('RATE_LIMITED')
  })

  it('counts each token independently', () => {
    const check = createRateLimiter()
    check('alpha', 1)
    expect(() => check('beta', 1)).not.toThrow()
  })

  it('frees the slot once the window has slid past', () => {
    const check = createRateLimiter()
    check('tok', 1)
    expect(() => check('tok', 1)).toThrow()

    vi.setSystemTime(60_001)
    expect(() => check('tok', 1)).not.toThrow()
  })

  it('honours a custom window length', () => {
    const check = createRateLimiter(1_000)
    check('tok', 1)
    expect(() => check('tok', 1)).toThrow()

    vi.setSystemTime(1_001)
    expect(() => check('tok', 1)).not.toThrow()
  })
})
