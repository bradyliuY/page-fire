// Multi-base-domain matching for the HTTP router.
// A host belongs to the service if it is, or is a subdomain of, one of the
// configured base domains. Host is matched case-insensitively (RFC 1035);
// entries in baseDomains are expected pre-normalized (see parseBaseDomains).

export function resolveBaseDomain(host: string, baseDomains: string[]): string | null {
  const h = host.toLowerCase()
  for (const d of baseDomains) {
    if (h === d || h.endsWith(`.${d}`)) return d
  }
  return null
}
