/**
 * Per-token sliding-window rate limiter.
 *
 * In-memory and therefore per-process — it bounds a single token's request
 * burst, it is not a global quota. Extracted from mcp/server.ts so the window
 * behaviour can be unit-tested without standing up the MCP transport.
 */
export function createRateLimiter(windowMs = 60_000) {
  const hits = new Map<string, number[]>()

  return function check(tokenId: string, limit: number): void {
    const now = Date.now()
    const recent = (hits.get(tokenId) ?? []).filter((t) => t > now - windowMs)
    if (recent.length >= limit) {
      throw { code: 'RATE_LIMITED', message: '请求太频繁，请稍后重试。' }
    }
    recent.push(now)
    hits.set(tokenId, recent)
  }
}
