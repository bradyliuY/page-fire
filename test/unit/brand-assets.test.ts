import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  LOGO_PNG,
  FAVICON_PNG,
  FAVICON_32_PNG,
  APPLE_TOUCH_ICON_PNG,
  FAVICON_ICO,
} from '../../src/http/assets.js'

/**
 * Guard: `src/http/assets.ts` 里内嵌的品牌素材是 `docs/product-design/brand/`
 * 两张源图的**派生物**,不是源图本身 —— LOGO 抠了背景并做了 alpha 裁剪,
 * favicon 裁内容、补成方形、降采样,ICO 是 16/32/48/64 四尺寸打包。
 *
 * 问题在于:派生过程没有留在仓库里(没有生成脚本,也不是简单的 base64),
 * 所以**换了源图而没重新生成,线上不会有任何变化,也没有任何东西会报错** ——
 * 你会以为换了 logo,实际访客看到的还是旧图。docs/product-design/README.md
 * 记的正是这个缺口。
 *
 * 本守卫不假装能重新生成(那需要把当时的裁切参数逆向出来),只钉住一件事:
 * **源图变了就必须有人做决定**。哈希对不上时,要么重新生成派生资源并更新
 * 下面的 SOURCE_HASHES,要么把源图改回去 —— 不能默默漂移。
 */

const REPO_ROOT = join(__dirname, '..', '..')
const BRAND_DIR = join(REPO_ROOT, 'docs', 'product-design', 'brand')

/**
 * `assets.ts` 生成时所用源图的 SHA-256。
 *
 * 改了源图 → 这个测试会红,那是有意的:先重新生成 assets.ts 里的五份派生资源
 * (LOGO / FAVICON / FAVICON_32 / APPLE_TOUCH_ICON / FAVICON_ICO),再把这里
 * 的哈希一并更新。只改哈希不改资源 = 把守卫关掉,等于没换图。
 */
const SOURCE_HASHES: Record<string, string> = {
  'pagefire-design.png': '61c8a8b6ae8e0f04ac6f5c960ce78f8afc7a11fe49c4401df5514d2b588f962f',
  'pagefire-logo.png': 'cd9238da48a949d7bbd94d3d1c108c55c11c807482bb4a1f96cfc43b6e42bd10',
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const ICO_MAGIC = Buffer.from([0x00, 0x00, 0x01, 0x00])

const EXPORTS: Array<{ name: string; buf: Buffer; magic: Buffer; kind: string }> = [
  { name: 'LOGO_PNG', buf: LOGO_PNG, magic: PNG_MAGIC, kind: 'PNG' },
  { name: 'FAVICON_PNG', buf: FAVICON_PNG, magic: PNG_MAGIC, kind: 'PNG' },
  { name: 'FAVICON_32_PNG', buf: FAVICON_32_PNG, magic: PNG_MAGIC, kind: 'PNG' },
  { name: 'APPLE_TOUCH_ICON_PNG', buf: APPLE_TOUCH_ICON_PNG, magic: PNG_MAGIC, kind: 'PNG' },
  { name: 'FAVICON_ICO', buf: FAVICON_ICO, magic: ICO_MAGIC, kind: 'ICO' },
]

describe('品牌素材', () => {
  describe('源图未变(变了就必须重新生成派生资源)', () => {
    for (const [file, expected] of Object.entries(SOURCE_HASHES)) {
      it(`${file} 与 assets.ts 生成时一致`, () => {
        const actual = sha256(join(BRAND_DIR, file))
        expect(
          actual,
          `${file} 的哈希与 assets.ts 生成时记录的不一致。\n` +
            `  记录: ${expected}\n` +
            `  实际: ${actual}\n` +
            `这说明源图被换过了,而 src/http/assets.ts 里内嵌的仍是**旧图的派生物** ——` +
            `线上不会自动跟着变。\n` +
            `请重新生成 LOGO / FAVICON / FAVICON_32 / APPLE_TOUCH_ICON / FAVICON_ICO` +
            `五份派生资源,再更新本文件里的 SOURCE_HASHES。若只是误改源图,请改回去。`,
        ).toBe(expected)
      })
    }
  })

  describe('内嵌数据本身是完好的', () => {
    for (const { name, buf, magic, kind } of EXPORTS) {
      it(`${name} 是合法的 ${kind}`, () => {
        // 26 行文件里塞着 5 段巨型 base64,粘错一段不会有别的测试发现。
        expect(buf.subarray(0, magic.length).equals(magic), `${name} 的魔数不是 ${kind}`).toBe(true)
        expect(buf.length).toBeGreaterThan(512)
      })
    }

    it('五份资源互不相同(防止把一个 base64 粘进两个槽位)', () => {
      const hashes = EXPORTS.map((e) => createHash('sha256').update(e.buf).digest('hex'))
      expect(new Set(hashes).size).toBe(EXPORTS.length)
    })
  })
})
