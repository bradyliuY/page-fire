import { readFileSync } from 'fs'
import { join } from 'path'

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const [k, ...v] = line.split('=')
      if (k && !process.env[k]) process.env[k] = v.join('=').trim()
    }
  } catch { /* .env optional */ }
}
loadEnv()

export interface Config {
  db: string
  sites: string
  httpHost: string
  httpPort: number
  mcpPort: number
  baseDomain: string
  rateLimit: number
}

export const config: Config = {
  db: process.env.PAGEFIRE_DB ?? './dev-data/pagefire.db',
  sites: process.env.PAGEFIRE_SITES ?? './dev-data/sites',
  httpHost: process.env.PAGEFIRE_HTTP_HOST ?? '127.0.0.1',
  httpPort: parseInt(process.env.PAGEFIRE_HTTP_PORT ?? '4000'),
  mcpPort: parseInt(process.env.PAGEFIRE_MCP_PORT ?? '4100'),
  baseDomain: process.env.PAGEFIRE_BASE_DOMAIN ?? 'localhost',
  rateLimit: parseInt(process.env.PAGEFIRE_RATE_LIMIT ?? '30'),
}
