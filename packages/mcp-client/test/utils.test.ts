import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseCliArgs, buildIgnore, collectFiles } from '../src/utils.js'

// ── parseCliArgs ──────────────────────────────────────────────────────────────

describe('parseCliArgs', () => {
  it('collects positional args', () => {
    const { flags, positional } = parseCliArgs(['./dist', '--pin'])
    expect(positional).toEqual(['./dist'])
    expect(flags.pin).toBe(true)
  })

  it('parses --key=value', () => {
    const { flags } = parseCliArgs(['--did=mysite', '--title=My Site'])
    expect(flags.did).toBe('mysite')
    expect(flags.title).toBe('My Site')
  })

  it('parses --key value for known value flags', () => {
    const { flags } = parseCliArgs(['--did', 'mysite', '--theme', 'dark'])
    expect(flags.did).toBe('mysite')
    expect(flags.theme).toBe('dark')
  })

  it('treats --pin as boolean', () => {
    const { flags } = parseCliArgs(['--pin'])
    expect(flags.pin).toBe(true)
  })

  it('accumulates repeated --exclude', () => {
    const { flags } = parseCliArgs(['--exclude=*.map', '--exclude=drafts/**'])
    expect(flags.exclude).toEqual(['*.map', 'drafts/**'])
  })

  it('accumulates --exclude with space-separated value', () => {
    const { flags } = parseCliArgs(['--exclude', '*.map', '--exclude', 'drafts/**'])
    expect(flags.exclude).toEqual(['*.map', 'drafts/**'])
  })

  it('handles mixed positional + flags', () => {
    const { flags, positional } = parseCliArgs(['./out', '--did=site', '--pin', '--exclude=*.map'])
    expect(positional).toEqual(['./out'])
    expect(flags.did).toBe('site')
    expect(flags.pin).toBe(true)
    expect(flags.exclude).toEqual(['*.map'])
  })
})

// ── buildIgnore / collectFiles ────────────────────────────────────────────────

let tmpDir: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'pf-test-'))
  // Build a sample directory structure:
  //   index.html
  //   css/style.css
  //   js/app.js
  //   node_modules/react/index.js   (should be ignored by default)
  //   .env                          (should be ignored by default)
  //   secret.pem                    (should be ignored by default)
  //   docs/intro.md
  //   docs/guide.md
  //   docs/image.png                (non-md, included in collectFiles but excluded with onlyMd)
  await writeFile(join(tmpDir, 'index.html'), '<html>test</html>')
  await mkdir(join(tmpDir, 'css'))
  await writeFile(join(tmpDir, 'css/style.css'), 'body {}')
  await mkdir(join(tmpDir, 'js'))
  await writeFile(join(tmpDir, 'js/app.js'), 'console.log("hi")')
  await mkdir(join(tmpDir, 'node_modules/react'), { recursive: true })
  await writeFile(join(tmpDir, 'node_modules/react/index.js'), '// react')
  await writeFile(join(tmpDir, '.env'), 'SECRET=abc')
  await writeFile(join(tmpDir, 'secret.pem'), '-----BEGIN CERT-----')
  await mkdir(join(tmpDir, 'docs'))
  await writeFile(join(tmpDir, 'docs/intro.md'), '# Intro')
  await writeFile(join(tmpDir, 'docs/guide.md'), '# Guide')
  await writeFile(join(tmpDir, 'docs/image.png'), Buffer.from([137, 80, 78, 71]))
})

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('buildIgnore', () => {
  it('ignores files inside node_modules by default', async () => {
    const ig = await buildIgnore(tmpDir)
    // The pattern is `node_modules/` (gitignore dir rule) — nested paths are ignored
    expect(ig.ignores('node_modules/react/index.js')).toBe(true)
  })

  it('ignores .env by default', async () => {
    const ig = await buildIgnore(tmpDir)
    expect(ig.ignores('.env')).toBe(true)
  })

  it('ignores *.pem by default', async () => {
    const ig = await buildIgnore(tmpDir)
    expect(ig.ignores('secret.pem')).toBe(true)
  })

  it('does not ignore normal files', async () => {
    const ig = await buildIgnore(tmpDir)
    expect(ig.ignores('index.html')).toBe(false)
    expect(ig.ignores('css/style.css')).toBe(false)
  })

  it('respects extra excludes', async () => {
    const ig = await buildIgnore(tmpDir, ['*.css'])
    expect(ig.ignores('css/style.css')).toBe(true)
    expect(ig.ignores('index.html')).toBe(false)
  })

  it('reads .pagefireignore when present', async () => {
    await writeFile(join(tmpDir, '.pagefireignore'), 'js/**\n')
    const ig = await buildIgnore(tmpDir)
    expect(ig.ignores('js/app.js')).toBe(true)
    expect(ig.ignores('css/style.css')).toBe(false)
    // clean up so later tests are not affected
    await rm(join(tmpDir, '.pagefireignore'))
  })
})

describe('collectFiles', () => {
  it('collects all non-ignored files', async () => {
    const files = await collectFiles(tmpDir)
    const paths = files.map(f => f.path).sort()
    expect(paths).toContain('index.html')
    expect(paths).toContain('css/style.css')
    expect(paths).toContain('js/app.js')
    expect(paths).toContain('docs/intro.md')
    expect(paths).toContain('docs/guide.md')
    // should NOT contain ignored files
    expect(paths).not.toContain('.env')
    expect(paths).not.toContain('secret.pem')
    expect(paths.find(p => p.startsWith('node_modules/'))).toBeUndefined()
  })

  it('utf8 encoding for text files', async () => {
    const files = await collectFiles(tmpDir)
    const html = files.find(f => f.path === 'index.html')
    expect(html?.encoding).toBe('utf8')
    expect(html?.content).toBe('<html>test</html>')
  })

  it('base64 encoding for binary files', async () => {
    const files = await collectFiles(tmpDir)
    const png = files.find(f => f.path === 'docs/image.png')
    expect(png?.encoding).toBe('base64')
  })

  it('onlyMd=true collects only .md files', async () => {
    const files = await collectFiles(tmpDir, true)
    const paths = files.map(f => f.path).sort()
    expect(paths).toEqual(['docs/guide.md', 'docs/intro.md'])
  })

  it('respects excludes argument', async () => {
    const files = await collectFiles(tmpDir, false, ['*.css'])
    expect(files.find(f => f.path === 'css/style.css')).toBeUndefined()
    expect(files.find(f => f.path === 'index.html')).toBeDefined()
  })

  it('throws when directory does not exist', async () => {
    await expect(collectFiles('/nonexistent/path')).rejects.toThrow('目录不存在')
  })

  it('throws when only onlyMd=true but no .md found in restricted tree', async () => {
    const sub = join(tmpDir, 'css')
    await expect(collectFiles(sub, true)).rejects.toThrow('没有 .md 文件')
  })
})
