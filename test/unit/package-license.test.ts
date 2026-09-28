import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard: **发到 npm 的包必须在 tarball 里带上许可证正文。**
 *
 * 背景是真实发生过的:`packages/mcp-client` 以 `pagefire-mcp` 发布在 npm 上,
 * `package.json` 写着 `"license": "MIT"`,README 也写着 MIT —— 但该目录下
 * **没有 LICENSE 文件**,而 npm 只会自动打包包目录下**存在**的许可证文件。
 * 于是 `npm pack` 出来的 tarball 只有 README、dist、package.json 四五个文件,
 * 装包的人拿不到任何许可证正文。
 *
 * 这类缺陷没人会主动发现:npm 不报错,CI 全绿,只有真去翻 tarball 才看得见。
 * 而它恰恰是开源合规上最不该省的一张纸。
 *
 * 注意 npm 的行为:许可证文件**不受 `files` 字段限制** —— 只要包目录下存在
 * LICENSE / LICENCE / COPYING 之一,npm 一定会打进 tarball。所以修法是往包目录
 * 放一份,而不是往 `files` 里加一行。
 */

const REPO_ROOT = join(__dirname, '..', '..')
const PACKAGES_DIR = join(REPO_ROOT, 'packages')

/** npm 认这些文件名(任一存在即自动打包)。 */
const LICENSE_NAMES = ['LICENSE', 'LICENCE', 'COPYING', 'LICENSE.md', 'LICENSE.txt']

interface Pkg {
  dir: string
  rel: string
  name: string
  private: boolean
  license: string | undefined
}

/** 枚举 packages 下每个子包(有 package.json 的目录)。 */
export function findPackages(root: string): Pkg[] {
  const out: Pkg[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifest = join(root, entry.name, 'package.json')
    if (!existsSync(manifest)) continue
    const json = JSON.parse(readFileSync(manifest, 'utf8'))
    out.push({
      dir: join(root, entry.name),
      rel: `packages/${entry.name}`,
      name: json.name ?? entry.name,
      private: json.private === true,
      license: json.license,
    })
  }
  return out
}

function hasLicenseFile(dir: string): boolean {
  return LICENSE_NAMES.some((n) => existsSync(join(dir, n)))
}

const PACKAGES = findPackages(PACKAGES_DIR)
const PUBLISHED = PACKAGES.filter((p) => !p.private)

describe('npm 包的许可证', () => {
  it('扫到了包(否则下面的断言是空转)', () => {
    expect(PACKAGES.length).toBeGreaterThan(0)
    expect(PACKAGES.map((p) => p.name)).toContain('pagefire-mcp')
  })

  it('每个要发布的包都声明了 license 字段', () => {
    const missing = PUBLISHED.filter((p) => !p.license).map((p) => p.rel)
    expect(missing, `这些包会在 npm 上以「无许可证」状态发布:\n${missing.join('\n')}`).toEqual([])
  })

  it('每个要发布的包目录下都有许可证文件(npm 才会打进 tarball)', () => {
    const missing = PUBLISHED.filter((p) => !hasLicenseFile(p.dir)).map((p) => p.rel)
    expect(
      missing,
      `以下包的 tarball 里不会有许可证正文 —— 在包目录下放一份 LICENSE(npm 会自动打包,\n` +
        `无需改 package.json 的 files 字段):\n${missing.join('\n')}`,
    ).toEqual([])
  })

  it('仓库根有 LICENSE(包里的许可证从它复制而来,不能是孤儿)', () => {
    expect(LICENSE_NAMES.some((n) => existsSync(join(REPO_ROOT, n)))).toBe(true)
  })
})
