import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { existsSync, readFileSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'

/**
 * Guard: 已提交文档里的**相对链接必须真的能打开**。
 *
 * 动机是真实的:品牌图从 `brand/` 挪到 `docs/product-design/brand/` 后,
 * README 顶部的 `<img src="brand/pagefire-logo.png">` 变成了死链 ——
 * 但没有任何东西会告诉你,直到有人点开 README 看到裂图。
 *
 * 这类漂移只有链接检查能兜住:文件搬走了、标题改了、文档重命名了,
 * 引用方不会自己知道。所以每次 CI 都全量扫一遍。
 *
 * 有意为之的例外见 ALLOW_MISSING。
 */

const REPO_ROOT = join(__dirname, '..', '..')

/**
 * 这里本来有一条豁免:`docs/deploy/` 是 gitignore 的私有运维手册,公开 clone 里
 * 不存在,于是守卫对它放行。**那条豁免本身是个缺陷。**
 *
 * 它把「本地能打开、clone 下来是死链」这种最该抓的情况,恰好护在了检查之外 ——
 * `docs/DEPLOY.md` 第九节就这么被放行了很久:它让读者去看 `docs/deploy/backup.sh`,
 * 而那个目录公开 clone 里没有、仓库里也从没提交过任何 `backup.sh`,指引对**任何**
 * 第三方都走不通,却一路绿灯。
 *
 * 正确做法不是豁免,而是**让公开文档自给自足**:读者需要的东西提交进仓库
 * (如 `scripts/backup.sh`),文档指向已提交的文件。所以豁免已删除 ——
 * 现在任何 md 里的相对链接都必须真的能打开。
 *
 * (维护者向文档若要提私有目录,写在行内代码里即可 —— 行内代码不算链接。)
 */

/** 外链 / 锚点 / 协议,不检查。 */
const EXTERNAL = /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i

/** markdown 行内链接 [文本](目标) —— 目标不含空格与右括号。 */
const MD_LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/** HTML 的 src / href,README 用 <img> 而非 markdown 图片语法。 */
const HTML_ATTR_RE = /\b(?:src|href)\s*=\s*"([^"]+)"/g

function trackedMarkdown(): string[] {
  const out = execFileSync('git', ['ls-files', '-z', '*.md'], { cwd: REPO_ROOT, encoding: 'utf8' })
  return out.split('\0').filter(Boolean)
}

/** 全部已提交文件,以及由它们推导出的目录集合(git 不跟踪目录本身)。 */
function trackedPaths(): { files: Set<string>; dirs: Set<string> } {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
  const files = new Set(out.split('\0').filter(Boolean))
  const dirs = new Set<string>()
  for (const f of files) {
    const parts = f.split('/')
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'))
  }
  return { files, dirs }
}

/** 取出一个文件里所有需要存在的相对目标(已去掉锚点/查询串)。 */
function relativeTargets(text: string): string[] {
  const found: string[] = []
  // 代码块里的示例链接不算引用;去掉 ``` 围栏内容避免误报
  const withoutFences = text.replace(/```[\s\S]*?```/g, '')
  // 再去掉行内代码:文档会写 `href="about.html"` 来说明**发布站点内**该怎么写链接,
  // 那是示例而非本仓库的文件。必须在剥围栏之后做,否则围栏内的单反引号会错配。
  const scannable = withoutFences.replace(/`[^`\n]*`/g, '')

  for (const re of [MD_LINK_RE, HTML_ATTR_RE]) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(scannable)) !== null) {
      let target = m[1].trim()
      if (!target || EXTERNAL.test(target)) continue
      target = target.split('#')[0].split('?')[0]
      if (!target) continue
      found.push(target)
    }
  }
  return found
}

const MD_FILES = trackedMarkdown()

describe('文档相对链接有效', () => {
  it('扫到了被提交的 markdown(防止守卫空转)', () => {
    expect(MD_FILES.length).toBeGreaterThan(3)
    expect(MD_FILES).toContain('README.md')
    expect(MD_FILES).toContain('docs/design.md')
  })

  it('每个相对链接/图片都指向存在的文件', () => {
    const broken: string[] = []

    for (const file of MD_FILES) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8')
      const baseDir = dirname(file)

      for (const target of relativeTargets(text)) {
        // 目标可能带 URL 编码(如空格 %20)
        const decoded = decodeURIComponent(target)
        const asPosix = join(baseDir, decoded).replace(/\\/g, '/')

        if (existsSync(resolve(REPO_ROOT, asPosix))) continue

        broken.push(`${file} → ${target}`)
      }
    }

    expect(
      broken,
      `以下相对链接指向不存在的文件(文件被移动/改名了?):\n${broken.join('\n')}`,
    ).toEqual([])
  })

  /**
   * 上一条只查工作区 —— 本地有文件、但忘了 `git add`,它照样是绿的,
   * 而公开仓库里 README 已经裂图了。这条把「必须已提交」也钉住。
   */
  it('每个相对链接的目标都已提交(不只是在本地存在)', () => {
    const { files, dirs } = trackedPaths()
    const untracked: string[] = []

    for (const file of MD_FILES) {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8')
      const baseDir = dirname(file)

      for (const target of relativeTargets(text)) {
        const asPosix = join(baseDir, decodeURIComponent(target)).replace(/\\/g, '/')
        const clean = asPosix.replace(/^\.\//, '').replace(/\/$/, '')

        if (files.has(clean) || dirs.has(clean)) continue

        untracked.push(`${file} → ${target}`)
      }
    }

    expect(
      untracked,
      `以下链接指向**未提交**的文件(本地能打开,clone 下来就是死链;记得 git add):\n${untracked.join('\n')}`,
    ).toEqual([])
  })
})

describe('relativeTargets — 链接抽取', () => {
  it('抽 markdown 链接与 HTML src/href,忽略外链与锚点', () => {
    const text = `
[内部](docs/design.md)
[带锚点](docs/design.md#架构)
[外链](https://github.com/bradyliuY/page-fire)
[锚点](#小节)
<img src="brand/logo.png" height="80">
<a href="docs/DEPLOY.md">部署</a>
`
    expect(relativeTargets(text)).toEqual([
      'docs/design.md',
      'docs/design.md',
      'brand/logo.png',
      'docs/DEPLOY.md',
    ])
  })

  it('忽略代码块里的示例(不是真引用)', () => {
    const text = '```\n[示例](不存在的路径.md)\n```\n\n[真的](README.md)\n'
    expect(relativeTargets(text)).toEqual(['README.md'])
  })

  it('忽略行内代码里的示例 —— 文档在讲「发布的站点里怎么写链接」', () => {
    // docs/MCP_GUIDE.md 真实存在这种句子:说明部署站点内的相对路径,
    // 里面的 href 是*示例*而不是本仓库的文件。
    const text = '用相对路径 `href="about.html"` 或 `href="docs/guide.html"`。见 [指南](docs/MCP_GUIDE.md)。'
    expect(relativeTargets(text)).toEqual(['docs/MCP_GUIDE.md'])
  })
})
