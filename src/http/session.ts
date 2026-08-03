import { createHmac, createHash, timingSafeEqual } from 'crypto'

/**
 * Stateless per-deployment access session.
 *
 * A successful password login issues a cookie whose value is a signed token:
 *   base64url("${did}.${expiryMs}") + "." + HMAC-SHA256(payload, key)
 *
 * The payload never contains the password — only the deployment id and an
 * expiry timestamp — so a stolen cookie can't reveal the passphrase. The HMAC
 * (key derived from the server secret) prevents forgery. No DB session table
 * is needed; validation is a pure signature + expiry check.
 */

export const SESSION_COOKIE = 'pf_auth'

/** Session lifetime: 24 hours from login. */
export const SESSION_MAX_AGE = 24 * 60 * 60 // seconds

/** Domain-separated HMAC key derived from the server secret (PAGEFIRE_TOKEN_ENC_KEY). */
export function sessionKey(secret: string): Buffer {
  return createHash('sha256').update('pagefire-access-session:' + secret).digest()
}

/** Build a signed session token for a deployment, valid from now for SESSION_MAX_AGE. */
export function signSessionToken(did: string, key: Buffer, now: number = Date.now()): string {
  const payload = `${did}.${now + SESSION_MAX_AGE * 1000}`
  const sig = createHmac('sha256', key).update(payload).digest('base64url')
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + sig
}

/** Verify a session token: valid HMAC, payload format, did match, not expired. */
export function verifySessionToken(token: string | undefined, did: string, key: Buffer, now: number = Date.now()): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  if (!payload) return false

  const expected = createHmac('sha256', key).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  if (!timingSafeEqual(a, b)) return false

  const last = payload.lastIndexOf('.')
  if (last === -1) return false
  const pDid = payload.slice(0, last)
  const pExpiry = Number(payload.slice(last + 1))
  return pDid === did && Number.isFinite(pExpiry) && pExpiry > now
}

/** Extract the session cookie value from a Cookie header. */
export function parseSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === SESSION_COOKIE) return part.slice(eq + 1).trim()
  }
  return undefined
}

/** Set-Cookie value that grants access (used on successful login). */
export function buildSetCookie(did: string, key: Buffer, secure: boolean): string {
  return `${SESSION_COOKIE}=${signSessionToken(did, key)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=${SESSION_MAX_AGE}`
}

/** Set-Cookie value that clears the session (used on logout). */
export function buildClearCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}; Max-Age=0`
}
