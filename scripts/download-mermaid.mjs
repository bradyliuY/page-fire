#!/usr/bin/env node
/**
 * Download mermaid UMD build from npm registry and save to dist/assets/.
 * Run once after `pnpm build`:  node scripts/download-mermaid.mjs
 *
 * The file is self-hosted so deployed pages load mermaid from same origin
 * (/__pf__/mermaid.min.js) rather than an external CDN.
 */
import { createWriteStream, mkdirSync } from 'fs'
import { get } from 'https'
import { join } from 'path'
import { fileURLToPath } from 'url'

const VERSION = '11'
const URL = `https://registry.npmjs.org/mermaid/-/mermaid-${VERSION}.0.0.tgz`
const DIRECT = `https://cdn.jsdelivr.net/npm/mermaid@${VERSION}/dist/mermaid.min.js`
const OUT_DIR = join(fileURLToPath(new URL('../dist/assets', import.meta.url)))
const OUT_FILE = join(OUT_DIR, 'mermaid.min.js')

mkdirSync(OUT_DIR, { recursive: true })

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
  })
}

console.log(`Downloading mermaid@${VERSION} → ${OUT_FILE}`)
download(DIRECT, OUT_FILE)
  .then(() => console.log('Done.'))
  .catch(err => { console.error('Failed:', err.message); process.exit(1) })
