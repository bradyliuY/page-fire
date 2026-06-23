import { join, resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import type Database from 'better-sqlite3'
import { serve404, serve401, serveFile } from './serve.js'
import { getTokenBySpaceId, getDeploymentByDid } from '../db/repo.js'
import { hashToken } from '../auth.js'

export function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  sitesDir: string,
  baseDomain: string,
): void {
  const host = (req.headers['host'] ?? '').split(':')[0]
  const url = req.url ?? '/'

  // Health check (internal only)
  if (url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }

  // Parse subdomain: <did>--<space_id>.baseDomain or <space_id>.baseDomain
  const suffix = `.${baseDomain}`
  if (!host.endsWith(suffix)) {
    serve404(res)
    return
  }
  const sub = host.slice(0, host.length - suffix.length)

  let did: string | null = null
  let spaceId: string

  if (sub.includes('--')) {
    const idx = sub.lastIndexOf('--')
    did = sub.slice(0, idx)
    spaceId = sub.slice(idx + 2)
  } else {
    spaceId = sub
  }

  const token = getTokenBySpaceId(db, spaceId)
  if (!token || token.status !== 'active') {
    serve404(res)
    return
  }

  if (!did) {
    // space_id-only URL (dashboard) not yet implemented → 404
    serve404(res)
    return
  }

  const deployment = getDeploymentByDid(db, did)
  if (!deployment || deployment.token_id !== token.id) {
    serve404(res)
    return
  }

  // Check expiry
  if (!deployment.pinned && deployment.expires_at && deployment.expires_at <= Date.now()) {
    serve404(res)
    return
  }

  // Password check
  if (deployment.access === 'password' && deployment.pass_hash) {
    const supplied = req.headers['x-passphrase'] as string | undefined
    if (!supplied || hashToken(supplied) !== deployment.pass_hash) {
      serve401(res)
      return
    }
  }

  // Resolve file path
  const deployDir = join(sitesDir, String(deployment.token_id), deployment.did)
  const filePath =
    url === '/' || url === ''
      ? join(deployDir, 'index.html')
      : join(deployDir, url.split('?')[0])

  // Security: ensure resolved path is within deployDir
  if (!resolve(filePath).startsWith(resolve(deployDir))) {
    serve404(res)
    return
  }

  serveFile(res, filePath)
}
