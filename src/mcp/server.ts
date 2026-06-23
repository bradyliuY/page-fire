import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import type { Config } from '../config.js'
import { deployPage } from './tools/deploy-page.js'
import { deployZip } from './tools/deploy-zip.js'
import { deployFilesTool } from './tools/deploy-files.js'
import { listDeploymentsTool } from './tools/list-deployments.js'
import { getDeploymentTool } from './tools/get-deployment.js'
import { pinDeploymentTool } from './tools/pin-deployment.js'
import { deleteDeploymentTool } from './tools/delete-deployment.js'
import { setAccessTool } from './tools/set-access.js'
import { setSpaceIdTool } from './tools/set-space-id.js'
import { verifyBearer } from '../auth.js'

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
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function makeError(err: any) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: err?.message ?? String(err), code: err?.code ?? 'INTERNAL_ERROR' }) }],
    isError: true,
  }
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
      'Publish a single HTML page and receive a public URL',
      {
        html: z.string().describe('Full HTML content to publish (UTF-8, max 10 MB)'),
        title: z.string().optional().describe('Human-readable title stored in the DB'),
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
