import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard: `.env.example` 必须是 `config.ts` 的**完整镜像**。
 *
 * 背景是真实的、且后果严重:`config.ts` 读了 `PAGEFIRE_TOKEN_ENC_KEY`,
 * 缺省值却是 `'0'.repeat(64)`(源码注释自己写着 "must be overridden in production")。
 * 而 `.env.example` 里没有这个变量 —— 按 `docs/DEPLOY.md` 的 `cp .env.example .env`
 * 部署出来的实例,会**静默地**用一个全零密钥运行。
 *
 * 那个密钥经 `sessionKey()` 派生出口令保护的 HMAC 签名密钥,派生是确定性的、
 * 无盐的(`sha256('pagefire-access-session:' + secret)`)。密钥公开可算 ⇒
 * 任何人都能伪造 `pf_auth` cookie,绕过任意部署的口令保护。
 *
 * 所以:**配置项漏在示例文件外,不只是文档不齐,是安全缺口。**
 * 这条守卫让「新增配置但忘了写进 .env.example」立刻变红。
 */

const REPO_ROOT = join(__dirname, '..', '..')
const CONFIG = join(REPO_ROOT, 'src', 'config.ts')
const EXAMPLE = join(REPO_ROOT, '.env.example')

/** config.ts 真正从环境读的变量(只看 process.env.X,不看类型声明里的注释)。 */
export function readEnvVars(source: string): Set<string> {
  return new Set(source.match(/process\.env\.(PAGEFIRE_[A-Z0-9_]+)/g)?.map((m) => m.replace('process.env.', '')) ?? [])
}

/** .env.example 里赋值的变量(忽略注释行)。 */
export function exampleVars(text: string): Set<string> {
  return new Set(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split('=')[0].trim())
      .filter(Boolean),
  )
}

describe('.env.example 覆盖 config.ts 的全部配置项', () => {
  const declared = readEnvVars(readFileSync(CONFIG, 'utf8'))
  const example = exampleVars(readFileSync(EXAMPLE, 'utf8'))

  it('config.ts 确实读了配置(防止守卫空转)', () => {
    expect(declared.size).toBeGreaterThan(5)
    expect(declared.has('PAGEFIRE_DB')).toBe(true)
  })

  it('没有配置项漏在示例文件外', () => {
    const missing = [...declared].filter((v) => !example.has(v)).sort()
    expect(
      missing,
      `这些变量 config.ts 会读,但 .env.example 里没有 —— 照抄示例部署的人会拿到缺省值(可能是危险的):\n${missing.join('\n')}`,
    ).toEqual([])
  })

  it('PAGEFIRE_TOKEN_ENC_KEY 必须在示例里,并给出生成方式与替换要求', () => {
    const text = readFileSync(EXAMPLE, 'utf8')
    expect(example.has('PAGEFIRE_TOKEN_ENC_KEY')).toBe(true)

    // 值必须恰好是 64 位 hex:token-enc.ts 直接 Buffer.from(keyHex,'hex') 喂给
    // aes-256-gcm,长度不对会在运行时抛错。所以示例值不能写成 'change-me' 之类。
    const line = text.split('\n').find((l) => l.trim().startsWith('PAGEFIRE_TOKEN_ENC_KEY='))
    expect(line, '.env.example 缺少 PAGEFIRE_TOKEN_ENC_KEY 赋值行').toBeTruthy()
    expect(line!.split('=')[1].trim(), '密钥必须是 64 位 hex(32 字节)').toMatch(/^[0-9a-fA-F]{64}$/)

    // 光有值不够 —— 得让人知道它是占位、必须换掉,以及怎么换。
    expect(text, '.env.example 必须写明如何生成密钥').toMatch(/openssl rand -hex 32/)
    expect(text, '.env.example 必须写明生产环境要替换该密钥').toMatch(/必须/)
  })
})

describe('readEnvVars / exampleVars — 解析', () => {
  it('只认 process.env 读取,忽略注释里的变量名', () => {
    const src = `
      // 说明:PAGEFIRE_IGNORED 只是注释
      db: process.env.PAGEFIRE_DB ?? './x',
      port: process.env.PAGEFIRE_HTTP_PORT ?? '4000',
    `
    expect([...readEnvVars(src)].sort()).toEqual(['PAGEFIRE_DB', 'PAGEFIRE_HTTP_PORT'])
  })

  it('忽略 .env.example 里的注释与空行', () => {
    const text = '# 注释\nPAGEFIRE_DB=./dev-data/pagefire.db\n\nPAGEFIRE_SITES=./dev-data/sites\n'
    expect([...exampleVars(text)].sort()).toEqual(['PAGEFIRE_DB', 'PAGEFIRE_SITES'])
  })
})
