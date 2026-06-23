import { createServer } from 'http'
import type Database from 'better-sqlite3'
import type { Config } from '../config.js'
import { handleRequest } from './router.js'

export function startHttpServer(
  db: Database.Database,
  config: Config,
): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      try {
        handleRequest(req, res, db, config.sites, config.baseDomain)
      } catch (err) {
        console.error('[http] Unhandled error:', err)
        res.writeHead(500)
        res.end('Internal Server Error')
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
