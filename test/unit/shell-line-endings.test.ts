import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { join } from 'path'

/**
 * Guard: **仓库里的 shell 脚本必须是 LF 行尾。**
 *
 * 这条不是洁癖,是一个会静默炸掉的部署缺陷:`docs/DEPLOY.md` 让读者把
 * `scripts/backup.sh` 装到服务器并交给 cron ——
 *
 *     37 3 * * * /opt/pagefire/scripts/backup.sh >> /var/log/pagefire-backup.log 2>&1
 *
 * cron 是**直接执行**这个文件的,内核要读第一行 shebang。行尾若是 CRLF,
 * shebang 就变成 `#!/usr/bin/env bash\r`,内核找不到名为 `bash\r` 的解释器,
 * 报一句 `bad interpreter: No such file or directory` 就结束 —— **备份再也不跑,
 * 而没有任何东西会告诉你**。这个仓库刚因为备份静默失败了 88 天补过一次课,
 * 同一种死法不该有第二条路径。
 *
 * 危险之处在于:这件事**取决于每台开发机的 git 配置**,而不是仓库本身。
 * Windows 上 `core.autocrlf=true`(本机就是)会在入库时把 CRLF 转成 LF,于是
 * 一切正常;换一台 `core.autocrlf=false` 的机器(Linux/macOS 的默认值)编辑同一
 * 个文件,写进去的 CRLF 就会**原样入库**。仓库里没有 `.gitattributes` 时,
 * 「blob 是 LF」是个没有出处的约定 —— 所以下面既钉住现状,也钉住那条声明。
 *
 * 判定一律交给 git 自己(`ls-files --eol` / `check-attr`),不去数字节:
 * `git show :path` 会套用 smudge 过滤,在 autocrlf=true 的机器上把 LF 显示成
 * CRLF —— 用它来查这件事**恰好会得出相反的错误结论**。
 */

const REPO_ROOT = join(__dirname, '..', '..')

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' })
}

/** 已提交的 shell 脚本(索引里的那份 —— 也就是别人 clone 下来会拿到的那份)。 */
export function trackedShellScripts(): string[] {
  return git(['ls-files', '-z', '*.sh']).split('\0').filter(Boolean)
}

/** 解析 `git ls-files --eol` 的输出,取每个文件**在索引里**的行尾。 */
export function indexEol(files: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  // 格式:`i/lf\tw/lf\tattr/\t<path>` —— 路径前是制表符,故按 \t 切最稳
  for (const line of git(['ls-files', '--eol', '--', ...files]).split('\n')) {
    const cols = line.split('\t')
    if (cols.length < 2) continue
    const idx = cols[0].trim().split(/\s+/)[0]
    out[cols[cols.length - 1].trim()] = idx
  }
  return out
}

/** 某个路径生效的 eol 属性(git 真正认的那个值,不是文件里写了什么)。 */
export function attrEol(file: string): string {
  const line = git(['check-attr', 'eol', '--', file]).trim()
  return line.split(': ').pop() ?? ''
}

const SHELL_FILES = trackedShellScripts()

describe('shell 脚本行尾', () => {
  it('扫到了脚本(否则下面的断言全是空转)', () => {
    expect(SHELL_FILES.length).toBeGreaterThan(0)
    expect(SHELL_FILES).toContain('scripts/backup.sh')
  })

  it('索引里的每个 .sh 都是 LF(别人 clone 到的就是这份)', () => {
    const eols = indexEol(SHELL_FILES)
    const bad = Object.entries(eols).filter(([, eol]) => eol !== 'i/lf')
    expect(
      bad,
      `以下脚本入库时带了 CR —— Linux 上 shebang 会变成 "#!/usr/bin/env bash\\r",\n` +
        `内核报 bad interpreter,脚本再也跑不起来(尤其 cron 直接执行的那种):\n` +
        bad.map(([f, e]) => `  ${f} → ${e}`).join('\n'),
    ).toEqual([])
  })

  it('.gitattributes 已提交(否则这条约定只活在开发机的 git 配置里)', () => {
    expect(
      git(['ls-files', '--', '.gitattributes']).trim(),
      '.gitattributes 没入库 —— 那么「blob 是 LF」就只是本机 core.autocrlf 的偶然结果,\n' +
        '在 autocrlf=false 的机器上编辑同一个脚本就会把 CRLF 原样提交进去。',
    ).toBe('.gitattributes')
  })

  it('git 真的把 .sh 的 eol 判成 lf(问的是生效值,不是文件里有没有那行字)', () => {
    const wrong = SHELL_FILES.filter((f) => attrEol(f) !== 'lf')
    expect(
      wrong,
      `以下脚本的 eol 属性不是 lf(应为 .gitattributes 里的 "*.sh text eol=lf"):\n` +
        wrong.map((f) => `  ${f} → ${attrEol(f)}`).join('\n'),
    ).toEqual([])
  })
})
