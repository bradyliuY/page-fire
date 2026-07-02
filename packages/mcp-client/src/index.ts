#!/usr/bin/env node
/**
 * pagefire-mcp — a thin stdio MCP connector for the hosted PageFire service.
 *
 * It does two things:
 *  1. Transparently forwards every MCP message to PageFire's Streamable HTTP endpoint
 *     (so all server-side tools work without the connector knowing about them), and
 *  2. Adds local-filesystem deploy tools (`deploy_dir`, `deploy_docs_dir`, `deploy_file`)
 *     that read files from disk and upload them OUT OF BAND to the server's /upload
 *     endpoint — so large files never pass through the model or the MCP tool arguments.
 *
 * Why: client runtimes with uncommon TLS fingerprints (e.g. Bun) get reset by network
 * middleboxes, so a direct `type: http` MCP connection fails. Running on the system Node
 * (OpenSSL) over stdio sidesteps that. The local deploy tools additionally make big-file
 * publishing O(1) tokens — the model passes a path, the connector streams the bytes.
 *
 * Config (token via env, never argv):
 *   { "mcpServers": { "pagefire": {
 *       "command": "npx", "args": ["-y", "pagefire-mcp"],
 *       "env": { "PAGEFIRE_TOKEN": "pf_xxx" } } } }
 *
 * Env:
 *   PAGEFIRE_TOKEN  (required)  pf_ Bearer token
 *   PAGEFIRE_URL    (optional)  endpoint override; default below
 *   PAGEFIRE_DEBUG  (optional)  "1" to log to stderr
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { parseCliArgs, collectFiles, TEXT_EXT, MAX_FILE_BYTES } from './utils.js'

const DEFAULT_URL = 'https://mcp.pagefire.openhkt.com/mcp'
const VERSION = '0.5.3'

const HELP = `pagefire v${VERSION}  (pagefire-mcp)

Usage:
  pagefire <command> [options]         # after: npm install -g pagefire-mcp
  npx pagefire-mcp <command> [options] # no install required

Commands:
  deploy <path>       publish a directory, .md file, or any file
                        directory  → static site (must contain index.html)
                        .md file   → rendered HTML page (Mermaid + Callout)
                        other file → served as index.html
  deploy-markdown <path>   publish .md file (with --mode slide for slideshow)
  deploy-presentation <path>  publish a PDF or PPTX file as a presentation
  deploy-docs <dir>   publish all .md files as a docs site with sidebar + TOC
  list                list all deployments for this token
  pin <did>           make a deployment permanent (removes TTL)
  delete <did>        delete a deployment and all its files

Options (deploy / deploy-markdown / deploy-docs / deploy-presentation):
  --did=<id>         custom deployment ID; same id = update in place
  --title=<text>     page / site title
  --pin              make permanent (no expiry)
  --theme=<t>        light | dark | sepia  (default: light)
  --mode=<m>         article | slide  (deploy-markdown only, default: article)
  --spa              SPA mode — 404 falls back to index.html  (deploy only)
  --access=<a>       public | password  (default: public)
  --password=<text>  required when --access=password
  --ttl-days=<n>     days until expiry  (default: 7)
  --exclude=<glob>   exclude pattern, repeatable; also reads .pagefireignore

Environment:
  PAGEFIRE_TOKEN  (required)  your pf_... Bearer token
  PAGEFIRE_URL    (optional)  self-hosted endpoint override
                              default: ${DEFAULT_URL}
  PAGEFIRE_DEBUG  (optional)  "1" → print debug output to stderr

MCP bridge (no subcommand — used by Claude / Cursor):
  Add to your MCP client config:
  { "command": "npx", "args": ["-y", "pagefire-mcp"],
    "env": { "PAGEFIRE_TOKEN": "pf_xxx" } }

Docs: https://pagefire.openhkt.com
`

function fail(msg: string): never {
  process.stderr.write(`[pagefire-mcp] ${msg}\n`)
  process.exit(1)
}

const flag = process.argv[2]
if (flag === '--version' || flag === '-v') { process.stdout.write(`${VERSION}\n`); process.exit(0) }
if (flag === '--help' || flag === '-h') { process.stderr.write(HELP); process.exit(0) }

const token = process.env.PAGEFIRE_TOKEN?.trim()
if (!token) fail('Missing PAGEFIRE_TOKEN. Set it in the "env" block of your MCP server config.')

let url: URL
try { url = new URL(process.env.PAGEFIRE_URL?.trim() || DEFAULT_URL) }
catch { fail(`Invalid PAGEFIRE_URL: ${process.env.PAGEFIRE_URL}`) }
const uploadUrl = url.href.replace(/\/mcp\/?$/, '/upload')

const debug = process.env.PAGEFIRE_DEBUG === '1'
const log = (...p: unknown[]) => { if (debug) process.stderr.write(`[pagefire-mcp] ${p.join(' ')}\n`) }

// ── Local tool definitions (merged into the server's tools/list) ──────────────
const LIFECYCLE_PROPS = {
  did: { type: 'string', description: '可选站点别名（3–32 位 [a-z0-9]）。复用同一 did 会原地更新、URL 不变；省略则随机。' },
  title: { type: 'string', description: '人类可读标题' },
  access: { type: 'string', enum: ['public', 'password'], description: '访问控制，默认 public' },
  password: { type: 'string', description: 'access=password 时的口令' },
  ttl_days: { type: 'integer', minimum: 1, maximum: 365, description: '过期天数（默认 7；pin=true 时忽略）' },
  pin: { type: 'boolean', description: '永久保留（默认 false）' },
}
const LOCAL_TOOLS = [
  {
    name: 'deploy_dir',
    description: '把本地目录递归上传并发布为静态站点（须含 index.html）。文件从磁盘直接读取并带外上传，不经过模型，因此可发布任意大小/数量的文件。优先用于发布本地构建产物（如 dist/）。',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: '本地目录的绝对或相对路径，递归上传其中所有文件。' },
        spa: { type: 'boolean', description: 'SPA 模式：未知路径回退 index.html（默认 false）' },
        exclude: { type: 'array', items: { type: 'string' }, description: '要排除的 glob(gitignore 语法),如 ["*.map","drafts/**","secret.txt"];也可在目录根放 .pagefireignore 文件。node_modules/.git/.env/*.pem 等默认已排除。' },
        ...LIFECYCLE_PROPS,
      },
      required: ['dir'],
    },
  },
  {
    name: 'deploy_docs_dir',
    description: '读取本地目录下所有 .md 文件，渲染成带侧边栏导航的文档站。文件从磁盘读取、带外上传，适合大量/大体积 Markdown。',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: '本地目录路径，递归读取其中所有 .md 文件。' },
        theme: { type: 'string', enum: ['light', 'dark', 'sepia'], description: '阅读主题，默认 light' },
        exclude: { type: 'array', items: { type: 'string' }, description: '要排除的 glob(gitignore 语法),也可在目录根放 .pagefireignore。' },
        ...LIFECYCLE_PROPS,
      },
      required: ['dir'],
    },
  },
  {
    name: 'deploy_file',
    description: '发布单个本地文件为网页（HTML 文件作为 index.html）。从磁盘读取、带外上传。',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '本地文件路径（通常是一个 .html）。' },
        spa: { type: 'boolean' },
        ...LIFECYCLE_PROPS,
      },
      required: ['path'],
    },
  },
]
const LOCAL_TOOL_NAMES = new Set(LOCAL_TOOLS.map((t) => t.name))

// Disk helpers are in ./utils.ts (exported for testing)

async function postUpload(payload: Record<string, unknown>) {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { throw new Error(`上传响应非 JSON（HTTP ${res.status}）：${text.slice(0, 200)}`) }
  if (!res.ok || data?.error) throw new Error(data?.error || `上传失败（HTTP ${res.status}）`)
  return data
}

async function runLocalTool(name: string, args: any): Promise<any> {
  if (name === 'deploy_dir') {
    const files = await collectFiles(String(args.dir), false, Array.isArray(args.exclude) ? args.exclude.map(String) : undefined)
    if (!files.some((f) => f.path === 'index.html')) throw new Error('目录中缺少 index.html')
    return postUpload({ files, did: args.did, title: args.title, access: args.access, password: args.password, ttl_days: args.ttl_days, pin: args.pin, spa: args.spa })
  }
  if (name === 'deploy_docs_dir') {
    const files = await collectFiles(String(args.dir), true, Array.isArray(args.exclude) ? args.exclude.map(String) : undefined)
    return postUpload({ render: 'docs', files, did: args.did, title: args.title, theme: args.theme, access: args.access, password: args.password, ttl_days: args.ttl_days, pin: args.pin })
  }
  if (name === 'deploy_file') {
    const p = String(args.path)
    const buf = await readFile(p).catch(() => { throw new Error(`文件不存在：${p}`) })
    if (buf.length > MAX_FILE_BYTES) throw new Error(`文件超过单文件 10 MB 上限`)
    const isText = TEXT_EXT.has(extname(p).toLowerCase())
    const file = isText
      ? { path: 'index.html', content: buf.toString('utf8'), encoding: 'utf8' as const }
      : { path: 'index.html', content: buf.toString('base64'), encoding: 'base64' as const }
    return postUpload({ files: [file], did: args.did, title: args.title, access: args.access, password: args.password, ttl_days: args.ttl_days, pin: args.pin, spa: args.spa })
  }
  throw new Error(`未知本地工具：${name}`)
}

// ── CLI mode ──────────────────────────────────────────────────────────────────
// Activated when called with a subcommand: npx pagefire-mcp deploy ./dist
const CLI_CMDS = new Set(['deploy', 'deploy-markdown', 'deploy-presentation', 'deploy-docs', 'list', 'delete', 'pin'])

async function callRemote(name: string, args: Record<string, unknown>) {
  const initRes = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'pagefire-cli', version: VERSION } } }),
  })
  const sid = initRes.headers.get('mcp-session-id')
  const callRes = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(sid ? { 'mcp-session-id': sid } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } }),
  })
  const text = await callRes.text()
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const msg = JSON.parse(line.slice(5))
      if (msg.result) return msg.result
      if (msg.error) throw new Error(msg.error.message ?? JSON.stringify(msg.error))
    } catch (e: any) { if (e?.message) throw e }
  }
  throw new Error('No result from server')
}

function parseMcpText(result: any) {
  const t = result?.content?.[0]?.text
  try { return t ? JSON.parse(t) : result?.structuredContent ?? result } catch { return t ?? result }
}

async function runCli(cmd: string, argv: string[]) {
  const { flags, positional } = parseCliArgs(argv)
  const lifecycle = {
    ...(flags.did ? { did: String(flags.did) } : {}),
    ...(flags.title ? { title: String(flags.title) } : {}),
    ...(flags.pin === true ? { pin: true } : {}),
    ...(flags['ttl-days'] ? { ttl_days: Number(flags['ttl-days']) } : {}),
    ...(flags.access ? { access: String(flags.access) } : {}),
    ...(flags.password ? { password: String(flags.password) } : {}),
  }

  if (cmd === 'list') {
    const data = parseMcpText(await callRemote('list_deployments', {}))
    const rows: any[] = data?.deployments ?? []
    if (!rows.length) { process.stdout.write('No deployments.\n'); return }
    const cols = ['did', 'url', 'pinned', 'files', 'expires'] as const
    const display = rows.map(d => ({
      did: d.did,
      url: d.url ?? d.domain ?? '-',
      pinned: d.pinned ? 'yes' : 'no',
      files: String(d.file_count ?? '-'),
      expires: d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 10) : '-',
    }))
    const widths = cols.map(c => Math.max(c.length, ...display.map(r => String(r[c]).length)))
    const fmt = (r: Record<string, string>) => cols.map((c, i) => String(r[c]).padEnd(widths[i])).join('  ')
    const header = Object.fromEntries(cols.map(c => [c, c])) as Record<string, string>
    process.stdout.write(fmt(header) + '\n')
    process.stdout.write(cols.map((_, i) => '-'.repeat(widths[i])).join('  ') + '\n')
    for (const row of display) process.stdout.write(fmt(row) + '\n')
    return
  }

  if (cmd === 'delete') {
    const did = positional[0]; if (!did) fail('Usage: pagefire-mcp delete <did>')
    await callRemote('delete_deployment', { did })
    process.stdout.write(`Deleted: ${did}\n`)
    return
  }

  if (cmd === 'pin') {
    const did = positional[0]; if (!did) fail('Usage: pagefire-mcp pin <did>')
    await callRemote('pin_deployment', { did })
    process.stdout.write(`Pinned: ${did}\n`)
    return
  }

  const excludes = Array.isArray(flags.exclude) ? flags.exclude as string[] : undefined

  if (cmd === 'deploy') {
    const target = positional[0]; if (!target) fail('Usage: pagefire-mcp deploy <path> [options]')
    const st = await stat(target).catch(() => null)
    if (!st) fail(`Not found: ${target}`)
    let data: any

    if (st.isDirectory()) {
      const files = await collectFiles(target, false, excludes)
      if (!files.some(f => f.path === 'index.html')) fail('Directory must contain index.html')
      process.stderr.write(`Deploying ${target} (${files.length} files)...\n`)
      data = await postUpload({ files, ...lifecycle, ...(flags.spa ? { spa: true } : {}) })
    } else if (extname(target).toLowerCase() === '.md') {
      const content = await readFile(target, 'utf8')
      process.stderr.write(`Publishing Markdown: ${target}\n`)
      data = parseMcpText(await callRemote('deploy_markdown', { markdown: content, theme: String(flags.theme ?? 'light'), ...lifecycle }))
    } else {
      const buf = await readFile(target)
      const isText = TEXT_EXT.has(extname(target).toLowerCase())
      const file = isText
        ? { path: 'index.html', content: buf.toString('utf8'), encoding: 'utf8' as const }
        : { path: 'index.html', content: buf.toString('base64'), encoding: 'base64' as const }
      process.stderr.write(`Deploying ${target}...\n`)
      data = await postUpload({ files: [file], ...lifecycle, ...(flags.spa ? { spa: true } : {}) })
    }

    const u = data?.url ?? data?.domain
    process.stdout.write((u ?? JSON.stringify(data, null, 2)) + '\n')
    return
  }

  if (cmd === 'deploy-markdown') {
    const target = positional[0]; if (!target) fail('Usage: pagefire-mcp deploy-markdown <path> [--mode=article|slide]')
    const content = await readFile(target, 'utf8').catch(() => fail(`File not found: ${target}`))
    const mode = String(flags.mode ?? 'article')
    process.stderr.write(`Publishing Markdown (mode=${mode}): ${target}\n`)
    const data = parseMcpText(await callRemote('deploy_markdown', {
      markdown: content, mode, theme: String(flags.theme ?? 'light'), ...lifecycle,
    }))
    const u = data?.url ?? data?.domain
    process.stdout.write((u ?? JSON.stringify(data, null, 2)) + '\n')
    return
  }

  if (cmd === 'deploy-presentation') {
    const target = positional[0]; if (!target) fail('Usage: pagefire-mcp deploy-presentation <path.pdf|path.pptx>')
    const ext = extname(target).toLowerCase()
    if (ext !== '.pdf' && ext !== '.pptx') fail('Unsupported format. Use .pdf or .pptx files.')
    const buf = await readFile(target).catch(() => fail(`File not found: ${target}`))
    const b64 = buf.toString('base64')
    const key = ext === '.pdf' ? 'pdf' : 'pptx'
    process.stderr.write(`Publishing ${ext} presentation: ${target} (${(buf.length / 1024 / 1024).toFixed(1)} MB)\n`)
    const data = parseMcpText(await callRemote('deploy_presentation', {
      [key]: b64, title: String(flags.title ?? target.replace(/\.(pdf|pptx)$/, '')),
      theme: String(flags.theme ?? 'light'), ...lifecycle,
    }))
    const u = data?.url ?? data?.domain
    process.stdout.write((u ?? JSON.stringify(data, null, 2)) + '\n')
    return
  }

  if (cmd === 'deploy-docs') {
    const target = positional[0]; if (!target) fail('Usage: pagefire-mcp deploy-docs <dir> [options]')
    const files = await collectFiles(target, true, excludes)
    process.stderr.write(`Publishing ${files.length} Markdown files from ${target}...\n`)
    const data = await postUpload({ render: 'docs', files, ...lifecycle, theme: String(flags.theme ?? 'light') })
    const u = data?.url ?? data?.domain
    process.stdout.write((u ?? JSON.stringify(data, null, 2)) + '\n')
    return
  }
}

if (CLI_CMDS.has(process.argv[2])) {
  runCli(process.argv[2], process.argv.slice(3)).catch(e => {
    process.stderr.write(`Error: ${e?.message ?? String(e)}\n`)
    process.exit(1)
  })
} else {

// ── Transports + routing ────────────────────────────────────────────────────────
const remote = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
})
const local = new StdioServerTransport()
const pendingToolsList = new Set<string | number>()

local.onmessage = async (msg: any) => {
  try {
    if (msg?.method === 'tools/list' && msg.id != null) {
      pendingToolsList.add(msg.id)
      await remote.send(msg)
      return
    }
    if (msg?.method === 'tools/call' && LOCAL_TOOL_NAMES.has(msg.params?.name)) {
      const id = msg.id
      try {
        const data = await runLocalTool(msg.params.name, msg.params.arguments ?? {})
        await local.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data } })
      } catch (e: any) {
        await local.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ error: e?.message ?? String(e), code: 'LOCAL_DEPLOY_ERROR' }) }], isError: true } })
      }
      return
    }
    await remote.send(msg)
  } catch (e) { log('local.onmessage error:', String(e)) }
}

// Discoverability: point the server's inline (content-string) deploy tools at the local-file
// tools, so a model that reaches for deploy_files/deploy_page learns it should NOT read large
// files into its context — it should pass a path to deploy_dir/deploy_file instead.
const STATIC_HINT =
  ' ⚡ 若内容是本地磁盘上的文件/目录,请改用 deploy_dir(整个目录)或 deploy_file(单个文件):' +
  '连接器直接读盘、带外上传,无需把文件内容读进对话,不受单次传参或上下文大小限制。'
const DOCS_HINT =
  ' ⚡ 若 Markdown 在本地磁盘上,请改用 deploy_docs_dir(读取目录下所有 .md),无需内联内容。'
const HINTS: Record<string, string> = {
  deploy_page: STATIC_HINT, deploy_files: STATIC_HINT, deploy_zip: STATIC_HINT,
  deploy_markdown: DOCS_HINT, deploy_docs: DOCS_HINT,
}

remote.onmessage = (msg: any) => {
  // Augment the server's tools/list response: add our local tools + a pointer hint on the inline ones.
  if (msg?.id != null && pendingToolsList.has(msg.id) && msg.result && Array.isArray(msg.result.tools)) {
    pendingToolsList.delete(msg.id)
    for (const t of msg.result.tools) {
      if (HINTS[t?.name] && typeof t.description === 'string' && !t.description.includes('deploy_dir')) {
        t.description += HINTS[t.name]
      }
    }
    msg.result.tools = [...msg.result.tools, ...LOCAL_TOOLS]
  }
  local.send(msg).catch((e) => log('local.send error:', String(e)))
}

let closing = false
const shutdown = (code = 0) => {
  if (closing) return
  closing = true
  Promise.allSettled([remote.close(), local.close()]).finally(() => process.exit(code))
}
local.onclose = () => shutdown(0)
remote.onclose = () => shutdown(0)
local.onerror = (e: Error) => log('local error:', String(e))
remote.onerror = (e: Error) => { log('remote error:', String(e)); if (!closing) process.stderr.write(`[pagefire-mcp] remote connection error: ${e.message}\n`) }
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

await remote.start()
await local.start()
log(`bridging stdio <-> ${url.href}  (+ local deploy tools, /upload at ${uploadUrl})`)
}
