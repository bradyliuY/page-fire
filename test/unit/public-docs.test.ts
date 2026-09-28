import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard: 本仓库是公开的 —— 已提交的文件里不得出现**运维坐标**。
 *
 * 架构与做法可以公开;具体坐标(主机 IP、同机其它服务的域名/容器名/路径、私钥路径)
 * 只允许存在于 `docs/deploy/`(已 gitignore)。
 *
 * 规则背景见 CLAUDE.md「公开仓库的信息边界」。变更服务器时改 `docs/deploy/` 下的私有文档,
 * 不要写进被提交的 md/ts。
 */

const REPO_ROOT = join(__dirname, '..', '..')

/**
 * 同机其它服务的名字/域名 —— 泄露同机邻居的身份,公开仓库不该出现。
 *
 * **词表本身不能写在这个文件里**:本仓库是公开的,把「邻居叫什么」写进
 * 守卫等于守卫自己泄露它。所以词表放在 `docs/deploy/`(已 gitignore),
 * 每行 `词 | 说明`,`#` 开头为注释,整词、大小写不敏感。
 *
 * 文件不存在时(别人的 clone、CI)退化为空表 —— 通用规则照跑,不因此红。
 */
const TERMS_FILE = 'docs/deploy/sensitive-terms.txt'

/** 词要进 RegExp,元字符必须转义,否则 `a.b` 会匹配上 `axb`。 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseSensitiveTerms(text: string): Array<{ label: string; re: RegExp }> {
  const out: Array<{ label: string; re: RegExp }> = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const [termPart, labelPart] = line.split('|')
    const term = (termPart ?? '').trim()
    if (!term) continue
    out.push({
      label: (labelPart ?? '').trim() || '同机其它服务',
      re: new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'),
    })
  }
  return out
}

function loadSensitiveTerms(): Array<{ label: string; re: RegExp }> {
  const path = join(REPO_ROOT, TERMS_FILE)
  if (!existsSync(path)) return []
  return parseSensitiveTerms(readFileSync(path, 'utf8'))
}

const CO_TENANT_PATTERNS = loadSensitiveTerms()

/**
 * 允许出现的「点分数字」:回环、通配绑定、RFC1918 私网、RFC5737 文档用地址。
 * 其余 IPv4 一律视为真实主机地址。
 */
const ALLOWED_IPV4 = [
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.2\./,      // TEST-NET-1
  /^198\.51\.100\./,   // TEST-NET-2
  /^203\.0\.113\./,    // TEST-NET-3
  /^255\.255\.255\.0$/,
]

const IPV4_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g

/**
 * 逐个八位组校验 0–255 且无前导零。
 * 少了这步会大量误报:内联 SVG 的 path `d="M12 2C6.477 2 2 6.484…"` 里
 * 相邻数字能被拼成 `2.91.832.092` 这类「伪 IP」。
 */
export function isIpv4(s: string): boolean {
  return s.split('.').every((part) => {
    if (part.length > 1 && part.startsWith('0')) return false
    const n = Number(part)
    return Number.isInteger(n) && n >= 0 && n <= 255
  })
}

/** 只扫文本类文件;二进制跳过。 */
const TEXT_EXT = /\.(md|ts|tsx|js|mjs|cjs|json|yml|yaml|sh|bash|txt|html|css|example|toml|sql)$/i

/**
 * 本测试文件自身含有这些模式(要测探测器,就得喂它几个 IP 字符串),跳过。
 * **必须写字面量,不能用 path.join** —— join 在 Windows 上给反斜杠,
 * 而 git ls-files 永远给正斜杠,排除会静默失效。下方有测试盯着这一点。
 */
const SELF = 'test/unit/public-docs.test.ts'

function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
  return out.split('\0').filter(Boolean)
}

function isText(path: string): boolean {
  // `.env.example` 之类的无扩展名/点文件按白名单放行
  if (TEXT_EXT.test(path)) return true
  return /(^|\/)(\.gitignore|\.env\.example|Dockerfile|LICENSE|Makefile)$/i.test(path)
}

const FILES = trackedFiles().filter((f) => f !== SELF && isText(f))

describe('isIpv4 — 真 IP 判定', () => {
  // 用例里的地址一律用 RFC5737 文档段(TEST-NET-3)—— 本守卫盯的正是本文件,
  // 在这写真实主机地址等于亲手制造它要防的那种泄露。
  it('接受合法 IPv4,含八位组边界 0 与 255', () => {
    expect(isIpv4('203.0.113.10')).toBe(true)
    expect(isIpv4('203.0.113.0')).toBe(true)
    expect(isIpv4('203.0.113.255')).toBe(true)
  })

  it('拒绝八位组越界的数字串(内联 SVG path 会产生这种伪 IP)', () => {
    // 这些正是 src/http/home.ts 里 inline SVG path data 中拼出来的串
    expect(isIpv4('9.504.5.092')).toBe(false)
    expect(isIpv4('2.91.832.092')).toBe(false)
    expect(isIpv4('268.18.58.688')).toBe(false)
    expect(isIpv4('4.943.359.309')).toBe(false)
  })

  it('拒绝前导零(非标准写法,避免 092 之类被当成 IP)', () => {
    expect(isIpv4('203.0.113.010')).toBe(false)
  })
})

describe('敏感词表解析', () => {
  it('逐行读词,忽略注释与空行', () => {
    const terms = parseSensitiveTerms([
      '# 注释行',
      '',
      'acme   | 同机其它服务的产品名',
      '   ',
      'example.org',
    ].join('\n'))
    expect(terms.map((t) => t.label)).toEqual(['同机其它服务的产品名', '同机其它服务'])
    expect(terms[0].re.test('Acme 的页面')).toBe(true)
    expect(terms[1].re.test('见 example.org')).toBe(true)
  })

  it('按整词匹配,不吃掉更长的词', () => {
    const [t] = parseSensitiveTerms('acme')
    expect(t.re.test('acme')).toBe(true)
    expect(t.re.test('acmecorp')).toBe(false)
  })

  it('转义正则元字符(词表里可能出现点号域名)', () => {
    const [t] = parseSensitiveTerms('a.b')
    expect(t.re.test('a.b')).toBe(true)
    expect(t.re.test('axb')).toBe(false)
  })

  it('空文本得到空表(文件缺失时守卫退化为只跑通用规则,而不是炸掉)', () => {
    expect(parseSensitiveTerms('')).toEqual([])
  })

  it('词表放在已 gitignore 的 docs/deploy/ 下', () => {
    // 这正是把词表挪出去的原因:本仓库公开,写在这里等于泄露邻居是谁。
    expect(TERMS_FILE.startsWith('docs/deploy/')).toBe(true)
  })
})

describe('公开仓库不泄露运维坐标', () => {
  it('扫到了被提交的文本文件(防止守卫本身空转)', () => {
    // 如果 git ls-files 拿不到东西,下面的断言会「全绿但没检查任何文件」。
    expect(FILES.length).toBeGreaterThan(20)
    expect(FILES).toContain('README.md')
    expect(FILES).toContain('docs/design.md')
  })

  it('自身排除项能对上 git 的路径(否则守卫会扫自己)', () => {
    // 这行曾经写成 path.join('test','unit','public-docs.test.ts')。
    // Windows 下 join 产生 `test\unit\...`(反斜杠),而 git ls-files 永远给正斜杠,
    // 于是 `f !== SELF` 永不成立、排除失效,守卫开始扫描自己。
    // 阴险之处:CI 跑在 Linux,join 正好给正斜杠、排除生效 —— 同一个缺陷
    // 本机红、CI 绿,而 CI 才是唯一的守门人。
    expect(SELF).not.toContain('\\')
    expect(trackedFiles()).toContain(SELF)
  })

  it.skipIf(CO_TENANT_PATTERNS.length === 0)(`不含 ${TERMS_FILE} 里列的名字或域名`, () => {
    const hits: string[] = []
    for (const file of FILES) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8')
      for (const { label, re } of CO_TENANT_PATTERNS) {
        text.split('\n').forEach((line, i) => {
          if (re.test(line)) hits.push(`${file}:${i + 1} [${label}] ${line.trim().slice(0, 80)}`)
        })
      }
    }
    expect(hits, `以下已提交文件泄露了同机其它服务的信息:\n${hits.join('\n')}`).toEqual([])
  })

  it('不含真实主机 IP(占位符/回环/私网/文档地址除外)', () => {
    const hits: string[] = []
    for (const file of FILES) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8')
      text.split('\n').forEach((line, i) => {
        for (const ip of line.match(IPV4_RE) ?? []) {
          if (!isIpv4(ip)) continue
          if (ALLOWED_IPV4.some((ok) => ok.test(ip))) continue
          hits.push(`${file}:${i + 1} ${ip} — ${line.trim().slice(0, 80)}`)
        }
      })
    }
    expect(hits, `以下已提交文件含真实主机 IP,请改用 <your-server-ip> 并把真实值移到 docs/deploy/:\n${hits.join('\n')}`).toEqual([])
  })
})

/**
 * 读者向文档 —— 公开读者被邀请去读的那些。它们必须**自给自足**:文里提到的
 * 每个文件,第三方 clone 下来都得拿得到。
 *
 * 反面例子是真实发生过的:`docs/DEPLOY.md` 第九节教人配备份,却让读者去看
 * `docs/deploy/backup.sh` —— 那目录已 gitignore、公开 clone 里根本没有,而仓库里
 * 也从没提交过任何 `backup.sh`。于是那条指引对**任何**第三方都走不通,而且不会
 * 报错:链接守卫早已对 `docs/deploy/` 开了豁免,正是这个豁免让死指引一直绿着。
 *
 * 维护者向的文档(CLAUDE.md / CONTRIBUTING.md / 本测试)不在此列 ——
 * 它们本来就要讲「运维坐标只放 docs/deploy/」这条规则,必须能提这个名字。
 */
const READER_FACING = [
  'README.md',
  'README.en.md',
  'docs/DEPLOY.md',
  'docs/MCP_GUIDE.md',
  'docs/design.md',
  'docs/plans/2026-09-02-multi-domain-design.md',
  'docs/product-design/README.md',
  'examples/README.md',
  'packages/mcp-client/README.md',
]

/** 私有运维目录:公开 clone 里不存在,因此读者向文档不能指过去。 */
const PRIVATE_DIR = 'docs/deploy'

describe('读者向文档自给自足', () => {
  it('名单里的文件都真实存在且已提交(名单写错就等于守卫空转)', () => {
    const files = trackedFiles()
    for (const f of READER_FACING) {
      expect(files, `${f} 不在已提交文件里 —— 改名了?那守卫正悄悄漏掉它`).toContain(f)
    }
  })

  it(`不提 ${PRIVATE_DIR}(公开 clone 拿不到,指过去就是走不通的指引)`, () => {
    const hits: string[] = []
    for (const file of READER_FACING) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8')
      text.split('\n').forEach((line, i) => {
        // 不区分链接与行内代码:对读者来说两者一样走不通。
        if (line.includes(PRIVATE_DIR)) {
          hits.push(`${file}:${i + 1} ${line.trim().slice(0, 100)}`)
        }
      })
    }
    expect(
      hits,
      `读者向文档指向了私有目录 ${PRIVATE_DIR}(公开 clone 里没有):\n${hits.join('\n')}\n` +
        `要么把读者真正需要的东西提交进仓库(如 scripts/),要么改指向已提交的公开文档。`,
    ).toEqual([])
  })
})
