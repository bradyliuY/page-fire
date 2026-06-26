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
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep, extname } from 'node:path'

const DEFAULT_URL = 'https://mcp.pagefire.openhkt.com/mcp'
const VERSION = '0.2.0'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.cache'])
// Extensions sent as utf8 text; everything else is base64-encoded.
const TEXT_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.txt', '.md', '.xml', '.svg'])

const HELP = `pagefire-mcp v${VERSION} — stdio connector for the hosted PageFire MCP service

Usage (in your MCP client config):
  command: npx
  args:    ["-y", "pagefire-mcp"]
  env:     { "PAGEFIRE_TOKEN": "pf_xxx" }

Adds local-file deploy tools on top of the hosted tools:
  deploy_dir       publish a local directory as a static site (reads files from disk)
  deploy_docs_dir  render every local .md file into a docs site
  deploy_file      publish a single local file

Environment:
  PAGEFIRE_TOKEN  (required)  pf_ Bearer token
  PAGEFIRE_URL    (optional)  endpoint override, default ${DEFAULT_URL}
  PAGEFIRE_DEBUG  (optional)  "1" to print diagnostics to stderr
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

// ── Disk helpers ──────────────────────────────────────────────────────────────
async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      out.push(...(await walk(join(dir, entry.name))))
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.')) continue
      out.push(join(dir, entry.name))
    }
  }
  return out
}

async function collectFiles(dir: string, onlyMd = false) {
  const st = await stat(dir).catch(() => null)
  if (!st || !st.isDirectory()) throw new Error(`目录不存在或不是目录：${dir}`)
  const abs = await walk(dir)
  const files: { path: string; content: string; encoding: 'utf8' | 'base64' }[] = []
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
  if (files.length === 0) throw new Error(onlyMd ? `目录中没有 .md 文件：${dir}` : `目录为空：${dir}`)
  return files
}

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
    const files = await collectFiles(String(args.dir), false)
    if (!files.some((f) => f.path === 'index.html')) throw new Error('目录中缺少 index.html')
    return postUpload({ files, did: args.did, title: args.title, access: args.access, password: args.password, ttl_days: args.ttl_days, pin: args.pin, spa: args.spa })
  }
  if (name === 'deploy_docs_dir') {
    const files = await collectFiles(String(args.dir), true)
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

remote.onmessage = (msg: any) => {
  // Augment the server's tools/list response with our local deploy tools.
  if (msg?.id != null && pendingToolsList.has(msg.id) && msg.result && Array.isArray(msg.result.tools)) {
    pendingToolsList.delete(msg.id)
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
