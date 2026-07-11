export const SECURITY_HEADERS: Record<string, string> = {
  // External HTTPS scripts (CDN, analytics, etc.) are allowed. For self-hosted options,
  // mermaid is available at /__pf__/mermaid.min.js.
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
}
