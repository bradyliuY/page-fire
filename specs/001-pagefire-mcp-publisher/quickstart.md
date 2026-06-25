# PageFire Developer Quickstart

**For**: Developers setting up a local PageFire instance for development/testing.
**Prerequisite**: Node.js 20+, pnpm, a writable directory.

---

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment

Copy `.env.example` to `.env` and adjust:

```
PAGEFIRE_DB=./dev-data/pagefire.db
PAGEFIRE_SITES=./dev-data/sites
PAGEFIRE_HTTP_HOST=127.0.0.1
PAGEFIRE_HTTP_PORT=4000
PAGEFIRE_MCP_PORT=4100
PAGEFIRE_BASE_DOMAIN=localhost
```

For local dev, `PAGEFIRE_BASE_DOMAIN=localhost` means deployment URLs will look like
`http://k3p9xa--v8x2qd.localhost:4000/` (works with `/etc/hosts` wildcard or a local DNS tool).

## 3. Build

```bash
pnpm build          # tsc → dist/
```

## 4. Create the first token

```bash
node dist/cli/index.js token create --slug dev --label "local dev token"
# Prints: pf_<secret>   ← copy this, shown only once
```

## 5. Start the server

```bash
pnpm start          # runs dist/index.js; starts MCP on :4100 and HTTP on :4000
```

Or via PM2 (matches production):
```bash
pm2 start dist/index.js --name pagefire --max-memory-restart 200M
```

## 6. Publish a test page

Using the MCP client (Claude Desktop, Cursor, etc.), add the server:

```json
{
  "mcpServers": {
    "pagefire": {
      "url": "http://127.0.0.1:4100/mcp",
      "headers": { "Authorization": "Bearer pf_<your-token>" }
    }
  }
}
```

Or test directly with curl:

```bash
# Health check
curl http://127.0.0.1:4000/healthz

# Deploy a page (direct HTTP to MCP is JSON-RPC over HTTP POST)
curl -X POST http://127.0.0.1:4100/mcp \
  -H "Authorization: Bearer pf_<your-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"deploy_page","arguments":{"html":"<h1>Hello PageFire</h1>"}}}'
```

## 7. Run tests

```bash
pnpm test           # vitest unit + integration
pnpm test:unit      # unit only
pnpm test:integration  # requires running server on default ports
```

## 8. CLI reference

```bash
node dist/cli/index.js token create --slug <name> [--label <text>]
node dist/cli/index.js token list
node dist/cli/index.js token disable --slug <name>
node dist/cli/index.js token rotate --slug <name>
node dist/cli/index.js gc                  # remove expired deployments
```

---

## Production differences

| Aspect | Local dev | Production |
|--------|-----------|------------|
| Base domain | `localhost` | `pagefire.openhkting.com` |
| TLS | none (HTTP) | nginx terminates TLS |
| MCP URL | `http://127.0.0.1:4100/mcp` | `https://mcp.pagefire.openhkting.com/mcp` |
| Process manager | node directly or PM2 | PM2 (`--max-memory-restart 200M`) |
| Data dir | `./dev-data/` | `/var/pagefire/` |

Full production deploy steps: `docs/deploy/PAGEFIRE_DEPLOY.md`.
