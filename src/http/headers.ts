/**
 * Security headers for every response.
 *
 * The CSP is deliberately permissive for scripts: deployed pages are arbitrary
 * user HTML, so `script-src 'unsafe-inline' https: 'unsafe-eval'` means the CSP
 * is not a real XSS boundary — an attacker who can inject HTML can already run
 * scripts. Its value is defense-in-depth for non-script resources and for
 * blocking non-https / non-web origins (data:, blob:, ws:, …).
 *
 * `'unsafe-eval'` is required by map SDKs (AMap JSAPI 2.0 ships with eval-based
 * plugin loading); it adds no attacker capability on top of `'unsafe-inline'`.
 * `worker-src`/`frame-src`/`media-src`/`font-src`/`style-src` are opened to
 * `https:` so common third-party embeds (maps, video, iframes, webfonts, CDN
 * stylesheets, workers) work out of the box without raising the script bar.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https:",
    "worker-src 'self' blob: https:",
    "frame-src 'self' https:",
    "media-src 'self' https:",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
}

/**
 * Directives PageFire's own injected features (view counter, meta bar) rely on.
 * Always merged into a custom policy so a deployment override can't silently
 * break them: the counter is an inline <script> + inline style= and POSTs to
 * the same-origin /_pf/counter endpoint.
 */
const REQUIRED_TOKENS: Record<string, string[]> = {
  'script-src': ["'unsafe-inline'"],
  'style-src': ["'unsafe-inline'"],
  'connect-src': ["'self'"],
}

/** Strip header-hostile control characters (would make setHeader throw ERR_INVALID_CHAR). */
function sanitizeCspValue(v: string): string {
  return v.replace(/[\x00-\x1f\x7f]/g, ' ').trim()
}

function parseCsp(csp: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const part of csp.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const sp = trimmed.indexOf(' ')
    if (sp === -1) { out.set(trimmed, []); continue }
    const name = trimmed.slice(0, sp)
    const sources = trimmed.slice(sp + 1).trim().split(/\s+/).filter(Boolean)
    out.set(name, sources)
  }
  return out
}

function serializeCsp(map: Map<string, string[]>): string {
  const parts: string[] = []
  for (const [name, sources] of map) {
    parts.push(sources.length ? `${name} ${sources.join(' ')}` : name)
  }
  return parts.join('; ')
}

function ensureToken(map: Map<string, string[]>, directive: string, token: string): void {
  const existing = map.get(directive)
  if (existing) {
    if (!existing.includes(token)) existing.push(token)
    return
  }
  // No explicit directive: if default-src exists, that fetch type falls back to
  // it — mirror it plus the required token so the user's fallback intent holds.
  const def = map.get('default-src')
  if (def) {
    map.set(directive, def.includes(token) ? def.slice() : [...def, token])
  }
  // Neither directive nor default-src → that fetch type is unrestricted, token already allowed.
}

/**
 * Merge a deployment's custom CSP with the platform minimum. The override keeps
 * every user-specified directive, but the tokens PageFire's injected features
 * need are guaranteed present, so a too-strict custom policy degrades the view
 * counter rather than silently breaking it.
 */
export function enforceMinimumCsp(userCsp: string): string {
  const map = parseCsp(userCsp)
  for (const [directive, tokens] of Object.entries(REQUIRED_TOKENS)) {
    for (const token of tokens) ensureToken(map, directive, token)
  }
  return serializeCsp(map)
}

/** Build security headers, optionally overriding the default CSP with a per-deployment custom policy. */
export function buildSecurityHeaders(cspOverride?: string | null): Record<string, string> {
  if (!cspOverride) return SECURITY_HEADERS
  return { ...SECURITY_HEADERS, 'Content-Security-Policy': enforceMinimumCsp(sanitizeCspValue(cspOverride)) }
}
