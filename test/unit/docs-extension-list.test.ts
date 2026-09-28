import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ALLOWED_EXTENSIONS } from '../../src/core/validate.js'

/**
 * Guard: 面向用户的扩展名表必须与代码里的白名单**逐个一致**。
 *
 * 背景是真实的:`docs/design.md` 手抄过一份白名单,抄的时候是 16 个,
 * 后来代码加到 33 个(媒体、演示文稿、字体全是后加的),文档没跟上 ——
 * 于是文档告诉读者 `.mp4` / `.pptx` 不能上传,而实际上可以。
 *
 * 这类「同一个事实写在两处」的漂移,靠人盯是盯不住的。白名单是**代码**决定的,
 * 所以让文档表去对齐 `ALLOWED_EXTENSIONS`:少了是漏文档,多了是文档撒谎。
 *
 * 权威源:`src/core/validate.ts`。用户可见的那份在 `docs/MCP_GUIDE.md`。
 */

const REPO_ROOT = join(__dirname, '..', '..')
const GUIDE = join(REPO_ROOT, 'docs', 'MCP_GUIDE.md')

/** 从 MCP_GUIDE 的表格行里抽出扩展名(单元格用 <br> 分组,组内逗号分隔)。 */
export function parseGuideExtensions(markdown: string): Set<string> {
  const row = markdown.split('\n').find((l) => l.includes('允许的文件扩展名'))
  if (!row) throw new Error('docs/MCP_GUIDE.md 里找不到扩展名表格行')
  // 先去掉 HTML 标签,否则 <br> 会被当成扩展名 `br`;
  // 分组标签(页面/图片/字体…)是中文,不会被 [a-z0-9] 匹配,无需特判。
  const withoutTags = row.replace(/<[^>]+>/g, ' ')
  return new Set(withoutTags.match(/[a-z0-9]+/g) ?? [])
}

const real = new Set([...ALLOWED_EXTENSIONS].map((e) => e.replace(/^\./, '')))

describe('docs/MCP_GUIDE.md 的扩展名表与 ALLOWED_EXTENSIONS 一致', () => {
  it('白名单本身够大(防止守卫空转)', () => {
    expect(real.size).toBeGreaterThan(20)
    expect(real.has('html')).toBe(true)
  })

  it('文档里没有代码不支持的扩展名(文档不能撒谎)', () => {
    const documented = parseGuideExtensions(readFileSync(GUIDE, 'utf8'))
    const extra = [...documented].filter((e) => !real.has(e))
    expect(extra, `MCP_GUIDE 承诺了这些扩展名,但 validate.ts 会拒绝:${extra.join(', ')}`).toEqual([])
  })

  it('代码支持的扩展名都在文档里(不能有隐形能力)', () => {
    const documented = parseGuideExtensions(readFileSync(GUIDE, 'utf8'))
    const missing = [...real].filter((e) => !documented.has(e))
    expect(missing, `这些扩展名能上传但文档没写:${missing.join(', ')}`).toEqual([])
  })
})

describe('parseGuideExtensions — 解析', () => {
  it('跨 <br> 分组逐条抽取', () => {
    const md = '| 允许的文件扩展名 | 页面：html, htm<br>媒体：mp4, webm |'
    expect([...parseGuideExtensions(md)].sort()).toEqual(['htm', 'html', 'mp4', 'webm'])
  })

  it('找不到那一行就报错,而不是静默返回空集', () => {
    expect(() => parseGuideExtensions('没有这张表')).toThrow(/找不到/)
  })
})
