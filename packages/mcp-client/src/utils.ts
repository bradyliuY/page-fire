/**
 * Pure utility functions shared between the MCP bridge and the CLI.
 * Extracted here so they can be unit-tested without spinning up a server.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep, extname } from 'node:path'
import ignore from 'ignore'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const DEFAULT_IGNORES = [
  'node_modules/', '.git/', '.svn/', '.hg/', '.cache/',
  '.DS_Store', 'Thumbs.db', '.pagefireignore',
  '.env', '.env.*', '*.pem', '*.key',
]

// Extensions sent as utf-8 text; everything else is base64-encoded.
export const TEXT_EXT = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.json',
  '.txt', '.md', '.xml', '.svg',
])

export type IgMatcher = { add(p: string | string[]): IgMatcher; ignores(p: string): boolean }

// Build a gitignore-style matcher: built-in defaults + optional .pagefireignore + extra excludes.
export async function buildIgnore(dir: string, excludes?: string[]): Promise<IgMatcher> {
  const ig = (ignore as unknown as () => IgMatcher)().add(DEFAULT_IGNORES)
  try { ig.add(await readFile(join(dir, '.pagefireignore'), 'utf8')) } catch { /* no file */ }
  if (excludes?.length) ig.add(excludes)
  return ig
}

// Recursively collect file paths under dir, respecting the ignore matcher.
export async function walk(dir: string, base: string, ig: IgMatcher): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    const rel = relative(base, abs).split(sep).join('/')
    if (entry.isDirectory()) {
      if (ig.ignores(rel) || ig.ignores(rel + '/')) continue
      out.push(...(await walk(abs, base, ig)))
    } else if (entry.isFile()) {
      if (!ig.ignores(rel)) out.push(abs)
    }
  }
  return out
}

export interface FileEntry {
  path: string
  content: string
  encoding: 'utf8' | 'base64'
}

// Collect files from a directory, optionally filtering to .md only.
export async function collectFiles(
  dir: string,
  onlyMd = false,
  excludes?: string[],
): Promise<FileEntry[]> {
  const st = await stat(dir).catch(() => null)
  if (!st?.isDirectory()) throw new Error(`目录不存在或不是目录：${dir}`)
  const ig = await buildIgnore(dir, excludes)
  const abs = await walk(dir, dir, ig)
  const files: FileEntry[] = []
  for (const f of abs) {
    const rel = relative(dir, f).split(sep).join('/')
    if (onlyMd && extname(f).toLowerCase() !== '.md') continue
    const buf = await readFile(f)
    if (buf.length > MAX_FILE_BYTES) throw new Error(`文件 "${rel}" 超过单文件 10 MB 上限`)
    const asText = TEXT_EXT.has(extname(f).toLowerCase())
    files.push(asText
      ? { path: rel, content: buf.toString('utf8'), encoding: 'utf8' }
      : { path: rel, content: buf.toString('base64'), encoding: 'base64' })
  }
  if (!files.length) throw new Error(
    onlyMd ? `目录中没有 .md 文件：${dir}` : `目录为空或全被排除规则过滤：${dir}`
  )
  return files
}

// Parse CLI argv into flags + positional args.
// Supports: --flag, --flag=value, --flag value (for most flags).
// --exclude is multi-value: repeated flags accumulate into an array.
export function parseCliArgs(argv: string[]): { flags: Record<string, string | boolean | string[]>; positional: string[] } {
  const flags: Record<string, string | boolean | string[]> = {}
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { positional.push(a); continue }
    const eq = a.indexOf('=')
    const key = eq !== -1 ? a.slice(2, eq) : a.slice(2)
    if (key === 'exclude') {
      const val = eq !== -1 ? a.slice(eq + 1) : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '')
      if (val) { if (!Array.isArray(flags.exclude)) flags.exclude = []; (flags.exclude as string[]).push(val) }
    } else if (eq !== -1) {
      flags[key] = a.slice(eq + 1)
    } else {
      // boolean flag or next-arg value
      const next = argv[i + 1]
      if (next && !next.startsWith('--') && ['did', 'title', 'theme', 'access', 'password', 'ttl-days'].includes(key)) {
        flags[key] = argv[++i]
      } else {
        flags[key] = true
      }
    }
  }
  return { flags, positional }
}
