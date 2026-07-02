import type { IncomingMessage, ServerResponse } from 'http'
import { request as httpRequest } from 'http'
import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import type { Config } from '../config.js'
import { generateTokenSecret, hashToken } from '../auth.js'
import { generateSpaceId } from '../core/ids.js'
import { encryptToken, decryptToken } from '../core/token-enc.js'
import {
  createToken, createUser, getUserByUsername, insertAuditLog,
  getInviteByCode, useInvite,
  createSession, getSessionUser, deleteSession, updateUserPassword,
  listTokensByUser, getTokenByIdForUser, revokeTokenById, countActiveTokensByUser,
  listDeploymentsByUser, getDeploymentForUser, deleteDeploymentRow, updateDeployment,
  setSpaceIdByTokenId, getTokenUsage,
  type UserRow,
} from '../db/repo.js'
import { deleteDeploymentFiles } from '../core/deploy.js'
import { validateCustomSpaceId, ValidationError } from '../core/validate.js'
import { SECURITY_HEADERS } from './headers.js'

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/
const SESSION_COOKIE = 'pf_session'
const MAX_KEYS_PER_USER = 10

// Tools allowed through the public Playground proxy. Excludes set_space_id
// (would rewrite every existing URL of the key) — destructive global change.
const PLAYGROUND_TOOLS = new Set([
  'list_deployments', 'get_deployment',
  'deploy_page', 'deploy_markdown', 'deploy_docs', 'deploy_files', 'deploy_zip',
  'deploy_presentation',
  'pin_deployment', 'set_access', 'delete_deployment',
])

// In-memory IP rate limiter for register endpoint (max 5/hour)
const registerLimiter = new Map<string, number[]>()

function checkRegisterRate(ip: string): boolean {
  const now = Date.now()
  const window = 3600_000
  const prev = registerLimiter.get(ip) ?? []
  const recent = prev.filter(t => t > now - window)
  if (recent.length >= 5) return false
  recent.push(now)
  registerLimiter.set(ip, recent)
  return true
}

function json(res: ServerResponse, status: number, data: unknown, extraHeaders?: Record<string, string>): void {
  const body = Buffer.from(JSON.stringify(data), 'utf8')
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', body.length)
  res.writeHead(status)
  res.end(body)
}

function readJson(req: IncomingMessage, maxBytes = 8192): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk; if (body.length > maxBytes) reject(new Error('too large')) })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = req.headers['cookie']
  if (!raw) return out
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim()
  }
  return out
}

function sessionCookie(sid: string): string {
  // 30 days; Secure because served over HTTPS via nginx; Lax so it survives top-level nav
  return `${SESSION_COOKIE}=${sid}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 3600}`
}

function clearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

function currentUser(req: IncomingMessage, db: Database.Database): UserRow | undefined {
  const sid = parseCookies(req)[SESSION_COOKIE]
  if (!sid) return undefined
  return getSessionUser(db, sid)
}

// Mask a token for display: pf_1234••••••cdef
function maskToken(enc: string | null, keyHex: string): string {
  if (!enc) return 'pf_••••••'
  try {
    const t = decryptToken(enc, keyHex)
    return t.slice(0, 7) + '••••••' + t.slice(-4)
  } catch { return 'pf_••••••' }
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  config: Config,
): Promise<boolean> {
  const url = (req.url ?? '').split('?')[0]
  const method = req.method ?? 'GET'
  const ip = (req.headers['x-real-ip'] as string | undefined) ?? req.socket.remoteAddress ?? ''

  // ── Register ────────────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/register') {
    const body = await readJson(req) as any
    const { username, password, invite_code } = body ?? {}

    if (!username || !USERNAME_RE.test(username)) {
      json(res, 400, { error: '用户名须 3–20 位，仅 [a-z0-9_-]' }); return true
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      json(res, 400, { error: '密码至少 6 位' }); return true
    }

    if (config.requireInvite) {
      if (!invite_code) { json(res, 400, { error: '需要邀请码才能注册' }); return true }
      const inv = getInviteByCode(db, invite_code)
      if (!inv || inv.used >= inv.max_uses) {
        json(res, 400, { error: '邀请码无效或已用完' }); return true
      }
    }

    const existing = getUserByUsername(db, username)
    if (existing) { json(res, 409, { error: '用户名已被注册' }); return true }

    // Rate limit check: only count actual new account creations
    if (!checkRegisterRate(ip)) {
      json(res, 429, { error: '注册太频繁，请 1 小时后再试' }); return true
    }

    const passwordHash = await bcrypt.hash(password, 10)
    // Two tables reference each other (users.token_id ↔ tokens.user_id).
    // Order to satisfy FKs: create token (user_id null) → create user → backfill token.user_id.
    const { token, plainToken, spaceId } = createApiKey(db, config, null, username)
    const user = createUser(db, {
      username, password_hash: passwordHash,
      token_id: token.id, invite_code: invite_code ?? null,
    })
    db.prepare('UPDATE tokens SET user_id = ? WHERE id = ?').run(user.id, token.id)

    if (config.requireInvite && invite_code) useInvite(db, invite_code)
    insertAuditLog(db, { token_id: token.id, action: 'user_register', ip })

    const sid = createSession(db, user.id)
    json(res, 200, { username: user.username, space_id: spaceId, token: plainToken },
      { 'Set-Cookie': sessionCookie(sid) })
    return true
  }

  // ── Login ─────────────────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/login') {
    const body = await readJson(req) as any
    const { username, password } = body ?? {}

    if (!username || !password) {
      json(res, 400, { error: '用户名和密码不能为空' }); return true
    }

    const user = getUserByUsername(db, username)
    if (!user) {
      await bcrypt.compare('dummy', '$2b$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      json(res, 401, { error: '用户名或密码错误' }); return true
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) { json(res, 401, { error: '用户名或密码错误' }); return true }

    const sid = createSession(db, user.id)
    json(res, 200, { username: user.username }, { 'Set-Cookie': sessionCookie(sid) })
    return true
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/logout') {
    const sid = parseCookies(req)[SESSION_COOKIE]
    if (sid) deleteSession(db, sid)
    json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() })
    return true
  }

  // ── Current user ──────────────────────────────────────────────────────────────
  if (method === 'GET' && url === '/api/me') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    // Aggregate usage across all API keys for this user
    const agg = db.prepare(`
      SELECT
        COUNT(d.id) AS dep_cnt,
        COALESCE(SUM(d.size_bytes), 0) AS dep_bytes,
        COALESCE(SUM(t.quota_deployments), 0) AS max_deps,
        COALESCE(SUM(t.quota_bytes), 0) AS max_bytes
      FROM tokens t LEFT JOIN deployments d ON d.token_id = t.id
        AND (d.pinned = 1 OR d.expires_at IS NULL OR d.expires_at > ?)
      WHERE t.user_id = ? AND t.status = 'active'
    `).get(Date.now(), user.id) as { dep_cnt: number; dep_bytes: number; max_deps: number; max_bytes: number }
    json(res, 200, {
      username: user.username,
      created_at: user.created_at,
      usage: {
        deployments: agg.dep_cnt,
        size_bytes: agg.dep_bytes,
        quota_deployments: agg.max_deps,
        quota_bytes: agg.max_bytes,
      },
    })
    return true
  }

  // ── Change password ───────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/account/password') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const body = await readJson(req) as any
    const current = typeof body?.current === 'string' ? body.current : ''
    const next = typeof body?.new === 'string' ? body.new : ''
    if (next.length < 6) { json(res, 400, { error: '新密码至少 6 位' }); return true }
    const ok = await bcrypt.compare(current, user.password_hash)
    if (!ok) { json(res, 401, { error: '当前密码错误' }); return true }
    const hash = await bcrypt.hash(next, 10)
    updateUserPassword(db, user.id, hash)
    insertAuditLog(db, { token_id: user.token_id, action: 'password_change', ip })
    json(res, 200, { ok: true })
    return true
  }

  // ── List API keys ─────────────────────────────────────────────────────────────
  if (method === 'GET' && url === '/api/keys') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const keys = listTokensByUser(db, user.id).map(k => {
      const usage = getTokenUsage(db, k.id)
      return {
        id: k.id,
        label: k.label,
        space_id: k.space_id,
        token_masked: maskToken(k.token_enc, config.tokenEncKey),
        status: k.status,
        deployment_count: k.deployment_count,
        size_bytes: usage.total_bytes,
        quota_deployments: k.quota_deployments,
        quota_bytes: k.quota_bytes,
        created_at: k.created_at,
        base_url: `https://${k.space_id}.${config.baseDomain}`,
      }
    })
    json(res, 200, { keys })
    return true
  }

  // ── List the user's deployments, grouped by API key ───────────────────────────
  if (method === 'GET' && url === '/api/deployments') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
    const rows = listDeploymentsByUser(db, user.id)
    const groups = new Map<string, any>()
    for (const d of rows) {
      let g = groups.get(d.token_id)
      if (!g) {
        g = {
          token_id: d.token_id,
          label: d.token_label,
          space_id: d.space_id,
          base_url: `${scheme}://${d.space_id}.${config.baseDomain}`,
          deployments: [],
        }
        groups.set(d.token_id, g)
      }
      g.deployments.push({
        did: d.did,
        url: `${scheme}://${d.domain}/`,
        domain: d.domain,
        title: d.title,
        access: d.access,
        pinned: d.pinned === 1,
        spa: d.spa === 1,
        size_bytes: d.size_bytes,
        file_count: d.file_count,
        expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
        created_at: new Date(d.created_at).toISOString(),
      })
    }
    json(res, 200, { groups: [...groups.values()], total: rows.length })
    return true
  }

  // ── Pin / unpin one of the user's deployments ─────────────────────────────────
  if (method === 'POST' && url.startsWith('/api/deployments/') && url.endsWith('/pin')) {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const did = decodeURIComponent(url.slice('/api/deployments/'.length, -'/pin'.length))
    const d = getDeploymentForUser(db, did, user.id)
    if (!d) { json(res, 404, { error: '部署不存在或无权访问' }); return true }
    const body = await readJson(req) as any
    const pinned = !!body?.pinned
    updateDeployment(db, did, pinned
      ? { pinned: 1, expires_at: null }
      : { pinned: 0, expires_at: Date.now() + 7 * 24 * 3600 * 1000 })
    insertAuditLog(db, { token_id: d.token_id, deployment_id: d.id, action: pinned ? 'pin' : 'unpin', ip })
    json(res, 200, { ok: true, pinned })
    return true
  }

  // ── Delete one of the user's deployments ──────────────────────────────────────
  if (method === 'DELETE' && url.startsWith('/api/deployments/')) {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const did = decodeURIComponent(url.slice('/api/deployments/'.length))
    const d = getDeploymentForUser(db, did, user.id)
    if (!d) { json(res, 404, { error: '部署不存在或无权访问' }); return true }
    deleteDeploymentFiles(config.sites, d.token_id, d.did)
    deleteDeploymentRow(db, did)
    insertAuditLog(db, { token_id: d.token_id, deployment_id: d.id, action: 'delete', ip })
    json(res, 200, { ok: true })
    return true
  }

  // ── Create API key ──────────────────────────────────────────────────────────
  if (method === 'POST' && url === '/api/keys') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    if (countActiveTokensByUser(db, user.id) >= MAX_KEYS_PER_USER) {
      json(res, 400, { error: `最多创建 ${MAX_KEYS_PER_USER} 个 API Key` }); return true
    }
    const body = await readJson(req) as any
    const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 40) : ''
    const customSpaceId = typeof body?.space_id === 'string' ? body.space_id.trim() : ''

    if (customSpaceId) {
      try { validateCustomSpaceId(customSpaceId) }
      catch (e) { json(res, 400, { error: (e as ValidationError).message }); return true }
    }

    try {
      const { plainToken, spaceId } = createApiKey(db, config, user.id, label || user.username, customSpaceId || undefined)
      json(res, 200, { token: plainToken, space_id: spaceId, label: label || null })
    } catch (e: any) {
      json(res, 400, { error: e?.message ?? '创建失败' })
    }
    return true
  }

  // ── Change a key's space_id (vanity subdomain) ────────────────────────────────
  if (method === 'POST' && url.startsWith('/api/keys/') && url.endsWith('/space-id')) {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const id = decodeURIComponent(url.slice('/api/keys/'.length, -'/space-id'.length))
    const tok = getTokenByIdForUser(db, id, user.id)
    if (!tok) { json(res, 404, { error: 'Key 不存在' }); return true }
    const body = await readJson(req) as any
    const sid = typeof body?.space_id === 'string' ? body.space_id.trim() : ''
    try { validateCustomSpaceId(sid) }
    catch (e) { json(res, 400, { error: (e as ValidationError).message }); return true }
    try { setSpaceIdByTokenId(db, id, sid) }
    catch (e: any) { json(res, 400, { error: e?.message ?? '修改失败', code: e?.code }); return true }
    // Keep deployment domains consistent with the new space_id.
    db.prepare("UPDATE deployments SET domain = did || '-' || ? WHERE token_id = ?")
      .run(`${sid}.${config.baseDomain}`, id)
    insertAuditLog(db, { token_id: id, action: 'set_space_id', ip })
    const scheme = config.baseDomain === 'localhost' ? 'http' : 'https'
    json(res, 200, { ok: true, space_id: sid, base_url: `${scheme}://${sid}.${config.baseDomain}` })
    return true
  }

  // ── Test API key (loopback to the real MCP endpoint) ──────────────────────────
  if (method === 'POST' && url.startsWith('/api/keys/') && url.endsWith('/test')) {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const id = decodeURIComponent(url.slice('/api/keys/'.length, -'/test'.length))
    const tok = getTokenByIdForUser(db, id, user.id)
    if (!tok) { json(res, 404, { error: 'Key 不存在' }); return true }
    if (tok.status !== 'active') { json(res, 400, { error: 'Key 已吊销' }); return true }
    const row = db.prepare('SELECT token_enc FROM tokens WHERE id = ?').get(id) as { token_enc: string | null } | undefined
    if (!row?.token_enc) { json(res, 400, { error: '无法读取该 Key（请重建）' }); return true }
    let plain: string
    try { plain = decryptToken(row.token_enc, config.tokenEncKey) }
    catch { json(res, 500, { error: '密钥解密失败' }); return true }
    try {
      const data = await mcpLoopback(config.mcpPort, config.httpHost, plain, 'list_deployments', {})
      if (data?.error) throw new Error(data.error)
      const count = Array.isArray(data?.deployments) ? data.deployments.length : 0
      json(res, 200, { ok: true, deployment_count: count })
    } catch (e: any) {
      json(res, 502, { ok: false, error: e?.message ?? 'MCP 连接失败' })
    }
    return true
  }

  // ── Playground: call an MCP tool with one of the user's own keys (same-origin proxy) ──
  if (method === 'POST' && url === '/api/playground') {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    let body: any
    try { body = await readJson(req, 24 * 1024 * 1024) }  // allow file uploads (zip/base64)
    catch { json(res, 413, { error: '请求体过大（上限 24 MB）' }); return true }
    const keyId = String(body?.key_id ?? '')
    const tool = String(body?.tool ?? '')
    const toolArgs = body?.arguments ?? {}
    if (!PLAYGROUND_TOOLS.has(tool)) {
      json(res, 400, { error: `演练场不支持工具 "${tool}"` }); return true
    }
    const tok = getTokenByIdForUser(db, keyId, user.id)
    if (!tok || tok.status !== 'active') { json(res, 400, { error: 'API Key 无效或已吊销' }); return true }
    const row = db.prepare('SELECT token_enc FROM tokens WHERE id = ?').get(keyId) as { token_enc: string | null } | undefined
    if (!row?.token_enc) { json(res, 400, { error: '无法读取该 Key（请重建）' }); return true }
    let plain: string
    try { plain = decryptToken(row.token_enc, config.tokenEncKey) }
    catch { json(res, 500, { error: '密钥解密失败' }); return true }
    const started = Date.now()
    try {
      const data = await mcpLoopback(config.mcpPort, config.httpHost, plain, tool, toolArgs)
      json(res, 200, {
        ok: !data?.error,
        request: { name: tool, arguments: toolArgs },
        result: data,
        ms: Date.now() - started,
      })
    } catch (e: any) {
      json(res, 502, { ok: false, error: e?.message ?? 'MCP 调用失败' })
    }
    return true
  }

  // ── Revoke API key ──────────────────────────────────────────────────────────
  if (method === 'DELETE' && url.startsWith('/api/keys/')) {
    const user = currentUser(req, db)
    if (!user) { json(res, 401, { error: '未登录' }); return true }
    const id = decodeURIComponent(url.slice('/api/keys/'.length))
    const tok = getTokenByIdForUser(db, id, user.id)
    if (!tok) { json(res, 404, { error: 'Key 不存在' }); return true }
    revokeTokenById(db, id)
    insertAuditLog(db, { token_id: id, action: 'key_revoke', ip })
    json(res, 200, { ok: true })
    return true
  }

  return false
}

// Call the real MCP endpoint over loopback with the given token, returning the tool's
// parsed JSON result. Used by the connection test and the playground proxy — exercising
// the full MCP auth + transport path the same way an external client would.
function mcpLoopback(
  mcpPort: number, host: string, token: string, name: string, args: unknown,
): Promise<any> {
  const payload = JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name, arguments: args ?? {} },
  })
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      host: host === '0.0.0.0' ? '127.0.0.1' : host, port: mcpPort, path: '/mcp', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (resp) => {
      let body = ''
      resp.on('data', (c) => { body += c })
      resp.on('end', () => {
        const m = body.match(/\{[\s\S]*\}/)
        if (!m) return reject(new Error('MCP 无有效响应'))
        try {
          const parsed = JSON.parse(m[0])
          const text = parsed?.result?.content?.[0]?.text
          resolve(text ? JSON.parse(text) : (parsed?.result ?? parsed))
        } catch { reject(new Error('解析 MCP 响应失败')) }
      })
    })
    req.on('error', (e) => reject(e))
    req.setTimeout(15000, () => { req.destroy(new Error('MCP 连接超时')) })
    req.end(payload)
  })
}

// Create a token (API key) for a user. Handles space_id allocation + token_enc storage.
function createApiKey(
  db: Database.Database, config: Config, userId: string | null, label: string, customSpaceId?: string,
): { token: ReturnType<typeof createToken>; plainToken: string; spaceId: string } {
  const plainToken = generateTokenSecret()
  const tokenHash = hashToken(plainToken)
  const tokenEnc = encryptToken(plainToken, config.tokenEncKey)
  const spaceId = customSpaceId ?? generateSpaceId(db)
  // unique, human-meaningless slug
  const slug = `k-${spaceId}`

  const token = createToken(db, {
    slug, space_id: spaceId, token_hash: tokenHash,
    label: label || null, user_id: userId, status: 'active',
    quota_deployments: 100, quota_bytes: 209715200,
  })
  db.prepare('UPDATE tokens SET token_enc = ? WHERE id = ?').run(tokenEnc, token.id)
  return { token, plainToken, spaceId }
}
