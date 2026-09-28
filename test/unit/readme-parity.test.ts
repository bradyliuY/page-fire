import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard: `README.md` 与 `README.en.md` 是**同一份文档的两份拷贝**。
 *
 * 这是仓库里漂移风险最高的一对 —— 全篇散文是对照翻译的,改中文很容易忘记英文。
 * 而漂移的后果不是「英文版旧一点」那么轻:英文 README 是 npm 主页与 GitHub 首页
 * 给非中文用户的第一印象,里面写着一个**不存在的工具名**或**拼错的子命令**,
 * 读者照着敲就是一条走不通的路。
 *
 * 所以这里不比对散文(那本来就该不同),只钉住**翻译不该改动的东西**:
 * 结构、链接、以及标识符(环境变量名、MCP 工具名、CLI 子命令)。
 * 这些是事实,不是措辞 —— 两份必须逐字一致。
 */

const REPO_ROOT = join(__dirname, '..', '..')
const ZH_FILE = 'README.md'
const EN_FILE = 'README.en.md'

const ZH = readFileSync(join(REPO_ROOT, ZH_FILE), 'utf8')
const EN = readFileSync(join(REPO_ROOT, EN_FILE), 'utf8')

/**
 * 去掉围栏代码块。**必须做**:README 的 bash 示例里写着一行 `# 全局安装(一次,永久可用)`,
 * 那是注释而非 markdown 标题 —— 不剥围栏,标题序列就会把注释也算进去,
 * 两份文档因此「恰好都多一个」而看不出真正的结构差异。
 */
export function stripFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '')
}

/** 标题层级序列(如 [1,2,3,3,2])。散文可译,层级不该变。 */
export function headingLevels(text: string): number[] {
  const out: number[] = []
  for (const line of stripFences(text).split('\n')) {
    const m = /^(#{1,6})\s+\S/.exec(line.trim())
    if (m) out.push(m[1].length)
  }
  return out
}

/** markdown 链接目标(含锚点),按出现顺序。 */
export function linkTargets(text: string): string[] {
  const out: string[] = []
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripFences(text))) !== null) out.push(m[1])
  return out
}

function sortedUnique(hits: RegExpMatchArray | null): string[] {
  return [...new Set(hits ?? [])].sort()
}

/** 环境变量名 —— 翻译不该动到标识符本身。 */
export function envNames(text: string): string[] {
  return sortedUnique(text.match(/\b(?:PAGEFIRE|WECHAT)_[A-Z0-9_]+\b/g))
}

/** MCP 工具名(带反引号的才算,避免散文里的普通词被误认)。 */
export function toolNames(text: string): string[] {
  return sortedUnique(text.match(/`((?:deploy|list|pin|delete|get)_[a-z_]+)`/g)?.map((s) => s.slice(1, -1)))
}

/** CLI 子命令。 */
export function cliSubcommands(text: string): string[] {
  return sortedUnique(text.match(/\bpagefire ([a-z][a-z-]*)/g)?.map((s) => s.split(' ')[1]))
}

const CASES: Array<{ name: string; pick: (t: string) => unknown }> = [
  { name: '标题层级序列', pick: headingLevels },
  { name: '链接目标(按顺序)', pick: linkTargets },
  { name: '环境变量名', pick: envNames },
  { name: 'MCP 工具名', pick: toolNames },
  { name: 'CLI 子命令', pick: cliSubcommands },
]

describe('中英 README 结构一致', () => {
  it('抽取器本身能用(否则下面的比对是两份空数组在互相点头)', () => {
    // 反空转:真的抽到了东西,而不是两边都没抽到所以「相等」。
    expect(headingLevels(ZH).length).toBeGreaterThan(10)
    expect(linkTargets(ZH).length).toBeGreaterThan(3)
    expect(envNames(ZH).length).toBeGreaterThan(3)
    expect(toolNames(ZH).length).toBeGreaterThan(5)
    expect(cliSubcommands(ZH).length).toBeGreaterThan(3)
  })

  it('剥围栏真的剥掉了(README 的 bash 注释不是标题)', () => {
    // 不剥的话 `# 全局安装…` 会被当成一级标题 —— 用一个最小样例钉住这个行为。
    const sample = '```bash\n# not a heading\n```\n\n## real heading\n'
    expect(headingLevels(sample)).toEqual([2])
  })

  for (const { name, pick } of CASES) {
    it(`${name}:${ZH_FILE} 与 ${EN_FILE} 逐字一致`, () => {
      expect(
        pick(EN),
        `${EN_FILE} 的${name}与 ${ZH_FILE} 不一致 —— 改了中文忘了英文?\n` +
          `翻译只该动措辞,不该动结构、链接与标识符。`,
      ).toEqual(pick(ZH))
    })
  }

  it('代码块数量一致', () => {
    const count = (t: string) => (t.match(/^```/gm) ?? []).length
    expect(count(EN)).toBe(count(ZH))
  })
})
