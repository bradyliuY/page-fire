import { config } from './config.js'
import { openDb } from './db/migrate.js'
import { startMcpServer } from './mcp/server.js'
import { startHttpServer } from './http/server.js'
import { ViewCounter } from './http/counter.js'

// Safety net: a single bad request (e.g. a stream error) must never take down the whole
// server. Node 20 terminates on unhandled rejections by default — log and keep serving instead.
process.on('unhandledRejection', (reason) => {
  console.error('[pagefire] Unhandled rejection (ignored):', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[pagefire] Uncaught exception (ignored):', err)
})

async function main() {
  const db = openDb(config.db)

  const counter = new ViewCounter(db)
  counter.start()

  const [mcpServer, httpServer] = await Promise.all([
    startMcpServer(db, config),
    startHttpServer(db, config, counter),
  ])

  function shutdown(signal: string) {
    console.log(`[pagefire] ${signal} received, shutting down...`)
    counter.stop()
    httpServer.close()
    db.close()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  console.log(`[pagefire] MCP server on ${config.httpHost}:${config.mcpPort}`)
  console.log(`[pagefire] HTTP server on ${config.httpHost}:${config.httpPort}`)
}

main().catch(err => {
  console.error('[pagefire] Fatal startup error:', err)
  process.exit(1)
})
