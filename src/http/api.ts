import type { IncomingMessage, ServerResponse } from 'http'
import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import type { Config } from '../config.js'
import { generateTokenSecret, hashToken } from '../auth.js'
import { generateSpaceId } from '../core/ids.js'
import { encryptToken, decryptToken } from '../core/token-enc.js'
import { createToken, createUser, getUserByUsername, insertAuditLog, getInviteByCode, useInvite } from '../db/repo.js'
import { SECURITY_HEADERS } from './headers.js'

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/

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

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = Buffer.from(JSON.stringify(data), 'utf8')
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Length', body.length)
  res.writeHead(status)
  res.end(body)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk; if (body.length > 8192) reject(new Error('too large')) })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  db: Database.Database,
  config: Config,
): Promise<boolean> {
  const url = req.url ?? ''
  const ip = (req.headers['x-real-ip'] as string | undefined) ?? req.socket.remoteAddress ?? ''

  if (req.method === 'POST' && url === '/api/register') {
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

    const plainToken = generateTokenSecret()
    const tokenHash = hashToken(plainToken)
    const tokenEnc = encryptToken(plainToken, config.tokenEncKey)
    const spaceId = generateSpaceId(db)
    const slug = `user-${username}`

    const token = createToken(db, {
      slug, space_id: spaceId, token_hash: tokenHash,
      label: username, status: 'active',
      quota_deployments: 100, quota_bytes: 209715200,
    })
    // store encrypted token for later display
    db.prepare('UPDATE tokens SET token_enc = ? WHERE id = ?').run(tokenEnc, token.id)

    const passwordHash = await bcrypt.hash(password, 10)
    const user = createUser(db, {
      username, password_hash: passwordHash,
      token_id: token.id, invite_code: invite_code ?? null,
    })

    if (config.requireInvite && invite_code) useInvite(db, invite_code)

    insertAuditLog(db, { token_id: token.id, action: 'user_register', ip })

    json(res, 200, {
      username: user.username,
      space_id: spaceId,
      token: plainToken,
    })
    return true
  }

  if (req.method === 'POST' && url === '/api/login') {
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

    const tokenRow = db.prepare('SELECT * FROM tokens WHERE id = ?').get(user.token_id) as any
    if (!tokenRow || tokenRow.status !== 'active') {
      json(res, 403, { error: '账户已被禁用，请联系管理员' }); return true
    }

    let plainToken = ''
    if (tokenRow.token_enc) {
      try { plainToken = decryptToken(tokenRow.token_enc, config.tokenEncKey) } catch { /* old token without enc */ }
    }

    json(res, 200, {
      username: user.username,
      space_id: tokenRow.space_id,
      token: plainToken,
    })
    return true
  }

  return false
}
