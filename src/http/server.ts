import { createServer } from 'http'
import type Database from 'better-sqlite3'
import type { Config } from '../config.js'
import { handleRequest } from './router.js'
import { handleApiRequest } from './api.js'
import { ViewCounter } from './counter.js'

export function startHttpServer(
  db: Database.Database,
  config: Config,
  counter?: ViewCounter,
): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        // API routes (async, bcrypt)
        if ((req.url ?? '').startsWith('/api/')) {
          const handled = await handleApiRequest(req, res, db, config)
          if (handled) return
        }
        handleRequest(req, res, db, config.sites, config.baseDomain, config.requireInvite, counter)
      } catch (err) {
        console.error('[http] Unhandled error:', err)
        if (!res.headersSent) { res.writeHead(500); res.end('Internal Server Error') }
      }
    })
    server.listen(config.httpPort, config.httpHost, () => {
      console.log(
        `[pagefire] HTTP static server listening on ${config.httpHost}:${config.httpPort}`,
      )
      resolve(server)
    })
  })
}
