#!/usr/bin/env node
/**
 * @openhkt/pagefire-mcp — a thin stdio MCP connector for the hosted PageFire service.
 *
 * It runs as a local stdio MCP server and transparently forwards every JSON-RPC
 * message to PageFire's Streamable HTTP endpoint, attaching your Bearer token.
 *
 * Why this exists: some MCP clients ship a bundled runtime (e.g. Bun) whose TLS
 * fingerprint gets reset by network middleboxes, so a direct `type: http` MCP
 * connection fails with `Failed to connect`. This connector runs on the system
 * Node (OpenSSL) and bridges over stdio, sidestepping that entirely.
 *
 * Config (token is read from env, never argv — avoids leaking it in `ps` and the
 * header-splitting footgun):
 *
 *   {
 *     "mcpServers": {
 *       "pagefire": {
 *         "command": "npx",
 *         "args": ["-y", "@openhkt/pagefire-mcp"],
 *         "env": { "PAGEFIRE_TOKEN": "pf_xxx" }
 *       }
 *     }
 *   }
 *
 * Env:
 *   PAGEFIRE_TOKEN  (required)  your pf_ Bearer token
 *   PAGEFIRE_URL    (optional)  override the endpoint (self-hosters); default below
 *   PAGEFIRE_DEBUG  (optional)  set to "1" to log to stderr
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'

const DEFAULT_URL = 'https://mcp.pagefire.openhkt.com/mcp'
const VERSION = '0.1.0'

const HELP = `pagefire-mcp v${VERSION} — stdio connector for the hosted PageFire MCP service

Usage (in your MCP client config):
  command: npx
  args:    ["-y", "@openhkt/pagefire-mcp"]
  env:     { "PAGEFIRE_TOKEN": "pf_xxx" }

Environment:
  PAGEFIRE_TOKEN  (required)  your pf_ Bearer token
  PAGEFIRE_URL    (optional)  endpoint override, default ${DEFAULT_URL}
  PAGEFIRE_DEBUG  (optional)  "1" to print diagnostics to stderr
`

function fail(msg: string): never {
  process.stderr.write(`[pagefire-mcp] ${msg}\n`)
  process.exit(1)
}

const flag = process.argv[2]
if (flag === '--version' || flag === '-v') {
  process.stdout.write(`${VERSION}\n`)
  process.exit(0)
}
if (flag === '--help' || flag === '-h') {
  process.stderr.write(HELP)
  process.exit(0)
}

const token = process.env.PAGEFIRE_TOKEN?.trim()
if (!token) {
  fail('Missing PAGEFIRE_TOKEN. Set it in the "env" block of your MCP server config.')
}

let url: URL
try {
  url = new URL(process.env.PAGEFIRE_URL?.trim() || DEFAULT_URL)
} catch {
  fail(`Invalid PAGEFIRE_URL: ${process.env.PAGEFIRE_URL}`)
}

const debug = process.env.PAGEFIRE_DEBUG === '1'
const log = (...parts: unknown[]) => {
  if (debug) process.stderr.write(`[pagefire-mcp] ${parts.join(' ')}\n`)
}

const remote = new StreamableHTTPClientTransport(url, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
})
const local = new StdioServerTransport()

// Transparent two-way forwarding at the JSON-RPC message layer.
local.onmessage = (m: JSONRPCMessage) => {
  remote.send(m).catch((e) => log('remote.send error:', String(e)))
}
remote.onmessage = (m: JSONRPCMessage) => {
  local.send(m).catch((e) => log('local.send error:', String(e)))
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
remote.onerror = (e: Error) => {
  log('remote error:', String(e))
  if (!closing) process.stderr.write(`[pagefire-mcp] remote connection error: ${e.message}\n`)
}
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

// Start the remote first so the very first stdin message (initialize) has somewhere to go.
await remote.start()
await local.start()
log(`bridging stdio <-> ${url.href}`)
