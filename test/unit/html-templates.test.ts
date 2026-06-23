import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })
}

// Curly/smart double quotes (U+201C “ , U+201D ”) in an HTML *attribute*
// position are almost always an accidental editor substitution of ASCII ".
// They silently break class/href/id matching — the rendered element gets no
// styles and there is no compile error, because the broken markup lives inside
// a template literal. Text content may legitimately contain “ ” (Chinese
// quotation marks in example copy), so we only flag the attribute-delimiter
// positions: `attr=“` / `”>` / `” />`.
const ATTR_CURLY = /=\s*[“”]|[“”]\s*\/?>/

describe('HTML template guard (src/http)', () => {
  const files = walk(resolve('src/http')).filter((f) => f.endsWith('.ts'))

  it('finds the http source files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`has no curly quotes in HTML attributes: ${file}`, () => {
      const offenders = readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((ln, i) => ({ n: i + 1, ln }))
        .filter(({ ln }) => ATTR_CURLY.test(ln))
        .map(({ n, ln }) => `  ${n}: ${ln.trim().slice(0, 80)}`)
      expect(
        offenders,
        `Curly quote in HTML attribute position (use ASCII "):\n${offenders.join('\n')}`,
      ).toEqual([])
    })
  }
})
