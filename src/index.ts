import { config } from './config.js'
import { openDb } from './db/migrate.js'
import { startMcpServer } from './mcp/server.js'
import { startHttpServer } from './http/server.js'

async function main() {
  const db = openDb(config.db)

  const [mcpServer, httpServer] = await Promise.all([
    startMcpServer(db, config),
    startHttpServer(db, config),
  ])

  process.on('SIGTERM', () => {
    console.log('[pagefire] SIGTERM received, shutting down...')
    httpServer.close()
    db.close()
    process.exit(0)
  })
  process.on('SIGINT', () => {
    console.log('[pagefire] SIGINT received, shutting down...')
    httpServer.close()
    db.close()
    process.exit(0)
  })

  console.log(`[pagefire] MCP server on ${config.httpHost}:${config.mcpPort}`)
  console.log(`[pagefire] HTTP server on ${config.httpHost}:${config.httpPort}`)
}

main().catch(err => {
  console.error('[pagefire] Fatal startup error:', err)
  process.exit(1)
})
