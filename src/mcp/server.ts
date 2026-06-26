import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import type { Config } from '../config.js'
import { deployPage } from './tools/deploy-page.js'
import { deployZip } from './tools/deploy-zip.js'
import { deployFilesTool } from './tools/deploy-files.js'
import { deployMarkdown } from './tools/deploy-markdown.js'
import { deployDocs } from './tools/deploy-docs.js'
import { listDeploymentsTool } from './tools/list-deployments.js'
import { getDeploymentTool } from './tools/get-deployment.js'
import { pinDeploymentTool } from './tools/pin-deployment.js'
import { deleteDeploymentTool } from './tools/delete-deployment.js'
import { setAccessTool } from './tools/set-access.js'
import { setSpaceIdTool } from './tools/set-space-id.js'
import { verifyBearer } from '../auth.js'
import { publish } from '../core/publish.js'
import { renderDocsSite } from '../core/docs.js'
import type { FileEntry } from '../core/deploy.js'

// Per-token sliding-window rate limiter (in-memory)
const rateLimiter = new Map<string, number[]>()

function checkRateLimit(tokenId: string, limit: number): void {
  const now = Date.now()
  const window = 60_000
  const prev = rateLimiter.get(tokenId) ?? []
  const recent = prev.filter((t) => t > now - window)
  if (recent.length >= limit) {
    throw { code: 'RATE_LIMITED', message: 'Too many requests — please wait before retrying' }
  }
  recent.push(now)
  rateLimiter.set(tokenId, recent)
}


function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { resolve({}) }
    })
  })
}

function makeResult(data: unknown) {
  const result: {
    content: { type: 'text'; text: string }[]
    structuredContent?: Record<string, unknown>
  } = {
    content: [{ type: 'text' as const, text: JSON.stringify(data) }],
  }
  // Also expose the payload as MCP structured output so clients that support it get
  // typed data instead of re-parsing the text. No outputSchema is declared, so the
  // SDK passes this through without validation.
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    result.structuredContent = data as Record<string, unknown>
  }
  return result
}

function makeError(err: any) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: err?.message ?? String(err), code: err?.code ?? 'INTERNAL_ERROR' }) }],
    isError: true,
  }
}

// Read a JSON upload body with a hard size cap (memory safety on a small box).
function readUploadBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const MAX = 64 * 1024 * 1024
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX) { reject({ code: 'PAYLOAD_TOO_LARGE', message: '上传体超过 64 MB 上限' }); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject({ code: 'INVALID_JSON', message: '请求体不是合法 JSON' }) }
    })
    req.on('error', reject)
  })
}

// Out-of-band file deploy: bytes arrive via a direct HTTP POST (read from disk by the
// local connector), never through the LLM or MCP tool arguments. Reuses publish().
async function handleUpload(
  body: any, token: NonNullable<ReturnType<typeof verifyBearer>>, db: Database.Database, config: Config, ip?: string,
) {
  const { files, render, did, title, theme, access, password, ttl_days, pin, spa } = body ?? {}
  if (!Array.isArray(files) || files.length === 0) {
    throw { code: 'INVALID_CONTENT', message: 'files is required' }
  }
  if (render === 'docs') {
    const pages = files.map((f: any) => ({
      path: String(f.path),
      markdown: f.encoding === 'base64' ? Buffer.from(f.content, 'base64').toString('utf8') : String(f.content),
    }))
    const htmlFiles = renderDocsSite(pages, { title, theme })
    return publish(db, config, token, { files: htmlFiles, did, title, access, password, ttl_days, pin, ip })
  }
  const bufFiles: FileEntry[] = files.map((f: any) => ({
    path: String(f.path),
    content: f.encoding === 'base64' ? Buffer.from(f.content, 'base64') : Buffer.from(String(f.content), 'utf8'),
  }))
  if (!bufFiles.some((f) => f.path === 'index.html' || f.path === './index.html')) {
    throw { code: 'MISSING_INDEX', message: 'files must include index.html at the root' }
  }
  return publish(db, config, token, { files: bufFiles, did, title, access, password, ttl_days, pin, spa, ip })
}

export async function startMcpServer(
  db: Database.Database,
  config: Config,
): Promise<ReturnType<typeof createServer>> {
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
      return
    }

    // Out-of-band upload — large files are read from disk by the connector and POSTed
    // here directly, so they never pass through the model or MCP tool arguments.
    if (req.method === 'POST' && req.url === '/upload') {
      try {
        const body = await readUploadBody(req)
        const token = verifyBearer(req.headers['authorization'] as string | undefined, db)
        if (!token) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid or missing Bearer token', code: 'UNAUTHORIZED' }))
          return
        }
        checkRateLimit(token.id, 20)
        const ip =
          (req.headers['x-real-ip'] as string | undefined) ??
          (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
          req.socket.remoteAddress
        const result = await handleUpload(body, token, db, config, ip)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (err: any) {
        const status = err?.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400
        if (!res.headersSent) {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err?.message ?? String(err), code: err?.code ?? 'UPLOAD_ERROR' }))
        }
      }
      return
    }

    const authHeader = req.headers['authorization'] as string | undefined
    const ip =
      (req.headers['x-real-ip'] as string | undefined) ??
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress

    // Build a fresh McpServer + transport per request (stateless / per-request session)
    const mcpServer = new McpServer({ name: 'pagefire', version: '0.1.0' })

    // ── deploy_page ──────────────────────────────────────────────────────────
    mcpServer.tool(
      'deploy_page',
      'Publish a single HTML page and receive a public URL. Pass `did` to publish to a named/stable URL or to update an existing page in place (URL stays the same).',
      {
        html: z.string().describe('Full HTML content to publish (UTF-8, max 10 MB)'),
        title: z.string().optional().describe('Human-readable title stored in the DB'),
        did: z.string().optional().describe('Optional site alias (3–32 chars, [a-z0-9], no hyphens). Reusing the same did updates that deployment in place — the URL never changes. Omit for a random one-off URL.'),
        access: z
          .enum(['public', 'password'])
          .optional()
          .describe('Access control — "public" (default) or "password"'),
        password: z
          .string()
          .optional()
          .describe('Passphrase required when access="password"'),
        ttl_days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Days until expiry (default 7); ignored when pin=true'),
        pin: z
          .boolean()
          .optional()
          .describe('Pin the deployment so it never expires (default false)'),
        spa: z
          .boolean()
          .optional()
          .describe('Enable SPA mode — unknown paths fall back to index.html for client-side routing (default false)'),
      },
      async (args) => {
        try {
          const tok = verifyBearer(authHeader, db)
          if (tok) checkRateLimit(tok.id, 20)
          return makeResult(await deployPage(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── deploy_zip ───────────────────────────────────────────────────────────
    mcpServer.tool(
      'deploy_zip',
      'Publish a multi-file ZIP package and receive a public URL',
      {
        zip_base64: z.string().describe('Base64-encoded ZIP archive (max 200 MB uncompressed, 500 files)'),
        title: z.string().optional().describe('Human-readable title stored in the DB'),
        did: z.string().optional().describe('Optional site alias (3–32 chars, [a-z0-9], no hyphens). Reusing the same did updates that site in place — the URL never changes.'),
        access: z
          .enum(['public', 'password'])
          .optional()
          .describe('Access control — "public" (default) or "password"'),
        password: z
          .string()
          .optional()
          .describe('Passphrase required when access="password"'),
        ttl_days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Days until expiry (default 7); ignored when pin=true'),
        pin: z
          .boolean()
          .optional()
          .describe('Pin the deployment so it never expires (default false)'),
        spa: z
          .boolean()
          .optional()
          .describe('Enable SPA mode — unknown paths fall back to index.html for client-side routing (default false)'),
      },
      async (args) => {
        try {
          const tok = verifyBearer(authHeader, db)
          if (tok) checkRateLimit(tok.id, 20)
          return makeResult(await deployZip(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── deploy_files ─────────────────────────────────────────────────────────
    mcpServer.tool(
      'deploy_files',
      'Publish multiple individual files and receive a public URL',
      {
        files: z
          .array(
            z.object({
              path: z.string().describe('Relative file path within the deployment (e.g. "index.html", "css/style.css")'),
              content: z.string().describe('File content — UTF-8 string or base64 encoded'),
              encoding: z
                .enum(['utf8', 'base64'])
                .optional()
                .describe('Content encoding — "utf8" (default) or "base64"'),
            }),
          )
          .min(1)
          .describe('Array of files to deploy; must include index.html at root'),
        title: z.string().optional().describe('Human-readable title stored in the DB'),
        did: z.string().optional().describe('Optional site alias (3–32 chars, [a-z0-9], no hyphens). Reusing the same did updates that site in place — the URL never changes.'),
        access: z
          .enum(['public', 'password'])
          .optional()
          .describe('Access control — "public" (default) or "password"'),
        password: z
          .string()
          .optional()
          .describe('Passphrase required when access="password"'),
        ttl_days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Days until expiry (default 7); ignored when pin=true'),
        pin: z
          .boolean()
          .optional()
          .describe('Pin the deployment so it never expires (default false)'),
        spa: z
          .boolean()
          .optional()
          .describe('Enable SPA mode — unknown paths fall back to index.html for client-side routing (default false)'),
      },
      async (args) => {
        try {
          const tok = verifyBearer(authHeader, db)
          if (tok) checkRateLimit(tok.id, 20)
          return makeResult(await deployFilesTool(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── deploy_markdown ──────────────────────────────────────────────────────
    mcpServer.tool(
      'deploy_markdown',
      'Render a Markdown document into a styled HTML page and publish it. Ideal for READMEs, articles, reports, and docs — no need to write HTML/CSS.',
      {
        markdown: z.string().describe('Markdown source (GFM supported: tables, task lists, code fences). Max 5 MB.'),
        title: z.string().optional().describe('Page title (defaults to the first # heading).'),
        theme: z.enum(['light', 'dark', 'sepia']).optional().describe('Reading theme — "light" (default), "dark", or "sepia".'),
        did: z.string().optional().describe('Optional site alias (3–32 chars, [a-z0-9], no hyphens). Reusing the same did updates the page in place — the URL never changes.'),
        access: z.enum(['public', 'password']).optional().describe('Access control — "public" (default) or "password".'),
        password: z.string().optional().describe('Passphrase required when access="password".'),
        ttl_days: z.number().int().min(1).max(365).optional().describe('Days until expiry (default 7); ignored when pin=true.'),
        pin: z.boolean().optional().describe('Pin so it never expires (default false).'),
      },
      async (args) => {
        try {
          const tok = verifyBearer(authHeader, db)
          if (tok) checkRateLimit(tok.id, 20)
          return makeResult(await deployMarkdown(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── deploy_docs ──────────────────────────────────────────────────────────
    mcpServer.tool(
      'deploy_docs',
      'Publish multiple Markdown files as a documentation site with left sidebar navigation and right per-page TOC. Inter-page .md links are auto-rewritten. No index.md required — entry page is resolved automatically (index.md → README.md → first file).',
      {
        files: z.array(z.object({
          path: z.string().describe('Page path ending in .md (e.g. "index.md", "guide/setup.md"). Becomes the same path with .html.'),
          markdown: z.string().describe('Markdown source for this page (GFM).'),
        })).min(1).describe('Markdown pages. No index.md required — entry is resolved automatically (index.md → README.md → first file). Max 200 pages, 10 MB total.'),
        title: z.string().optional().describe('Site title shown in the sidebar header.'),
        theme: z.enum(['light', 'dark', 'sepia']).optional().describe('Reading theme — "light" (default), "dark", or "sepia".'),
        did: z.string().optional().describe('Optional site alias (3–32 chars, [a-z0-9], no hyphens). Reusing the same did updates the docs site in place — the URL never changes.'),
        access: z.enum(['public', 'password']).optional().describe('Access control — "public" (default) or "password".'),
        password: z.string().optional().describe('Passphrase required when access="password".'),
        ttl_days: z.number().int().min(1).max(365).optional().describe('Days until expiry (default 7); ignored when pin=true.'),
        pin: z.boolean().optional().describe('Pin so it never expires (default false).'),
      },
      async (args) => {
        try {
          const tok = verifyBearer(authHeader, db)
          if (tok) checkRateLimit(tok.id, 20)
          return makeResult(await deployDocs(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── list_deployments ─────────────────────────────────────────────────────
    mcpServer.tool(
      'list_deployments',
      'List all deployments for this token',
      {
        include_expired: z.boolean().optional().describe('Include expired deployments in the list (default false)'),
      },
      async (args) => {
        try {
          return makeResult(listDeploymentsTool(args, authHeader, db, config))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── get_deployment ───────────────────────────────────────────────────────
    mcpServer.tool(
      'get_deployment',
      'Get details of a specific deployment',
      {
        did: z.string().describe('Deployment ID to look up'),
      },
      async (args) => {
        try {
          return makeResult(getDeploymentTool(args, authHeader, db, config))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── pin_deployment ───────────────────────────────────────────────────────
    mcpServer.tool(
      'pin_deployment',
      'Pin a deployment so it never expires',
      {
        did: z.string().describe('Deployment ID to pin'),
      },
      async (args) => {
        try {
          return makeResult(pinDeploymentTool(args, authHeader, db, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── delete_deployment ────────────────────────────────────────────────────
    mcpServer.tool(
      'delete_deployment',
      'Delete a deployment and all its files',
      {
        did: z.string().describe('Deployment ID to delete'),
      },
      async (args) => {
        try {
          return makeResult(deleteDeploymentTool(args, authHeader, db, config, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── set_access ───────────────────────────────────────────────────────────
    mcpServer.tool(
      'set_access',
      'Change access mode (public/password) of a deployment',
      {
        did: z.string().describe('Deployment ID to update'),
        access: z
          .enum(['public', 'password'])
          .describe('New access control setting — "public" or "password"'),
        password: z
          .string()
          .optional()
          .describe('Passphrase required when access="password"'),
      },
      async (args) => {
        try {
          return makeResult(setAccessTool(args, authHeader, db, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── set_space_id ─────────────────────────────────────────────────────────
    mcpServer.tool(
      'set_space_id',
      'Set a custom space_id for your token — changes the subdomain segment shared by all your deployment URLs',
      {
        space_id: z
          .string()
          .describe('Custom space_id: 4–20 chars, only [a-z0-9-], cannot start/end with "-" or contain "--". Example: "myteam", "project-x". Warning: changing this invalidates all existing deployment URLs.'),
      },
      async (args) => {
        try {
          return makeResult(setSpaceIdTool(args, authHeader, db, ip))
        } catch (err: any) {
          return makeError(err)
        }
      },
    )

    // ── Streamable HTTP transport ────────────────────────────────────────────
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })
    res.on('close', () => { transport.close().catch(() => {}) })

    try {
      await mcpServer.connect(transport)
      const body = await readBody(req)
      await transport.handleRequest(req, res, body)
    } catch (err: any) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err?.message ?? 'Internal server error' }))
      }
    }
  })

  return new Promise((resolve, reject) => {
    httpServer.on('error', reject)
    httpServer.listen(config.mcpPort, config.httpHost, () => {
      console.log(`[pagefire] MCP server listening on ${config.httpHost}:${config.mcpPort}`)
      resolve(httpServer)
    })
  })
}
