#!/usr/bin/env node
import { config } from '../config.js'
import { openDb } from '../db/migrate.js'
import { createToken, listTokens, disableToken, rotateSpaceId, getTokenBySlug, listExpiredDeployments, deleteDeploymentRow, insertAuditLog, setSpaceIdByTokenId } from '../db/repo.js'
import { generateTokenSecret, hashToken } from '../auth.js'
import { generateSpaceId } from '../core/ids.js'
import { deleteDeploymentFiles } from '../core/deploy.js'
import { validateCustomSpaceId, ValidationError } from '../core/validate.js'

const db = openDb(config.db)
const args = process.argv.slice(2)
const [cmd, sub, ...rest] = args

function parseFlags(arr: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].startsWith('--')) {
      const key = arr[i].slice(2)
      flags[key] = arr[i + 1] ?? 'true'
      i++
    }
  }
  return flags
}

if (cmd === 'token') {
  if (sub === 'create') {
    const flags = parseFlags(rest)
    if (!flags.slug) { console.error('Usage: pagefire token create --slug <name> [--label <text>]'); process.exit(1) }
    const plain = generateTokenSecret()
    const hash = hashToken(plain)
    let spaceId: string
    if (flags['space-id']) {
      try { validateCustomSpaceId(flags['space-id']) } catch (e) {
        console.error((e as ValidationError).message); process.exit(1)
      }
      spaceId = flags['space-id']
    } else {
      spaceId = generateSpaceId(db)
    }
    const row = createToken(db, { slug: flags.slug, space_id: spaceId, token_hash: hash, label: flags.label ?? null, status: 'active', quota_deployments: 100, quota_bytes: 209715200 })
    insertAuditLog(db, { token_id: row.id, action: 'token_create' })
    console.log('Token created:')
    console.log(`  slug:     ${row.slug}`)
    console.log(`  space_id: ${row.space_id}`)
    console.log(`  token:    ${plain}  <- save this, shown only once`)

  } else if (sub === 'list') {
    const tokens = listTokens(db)
    if (tokens.length === 0) { console.log('No tokens found.'); process.exit(0) }
    console.log(`\n${'SLUG'.padEnd(20)} ${'SPACE_ID'.padEnd(12)} ${'STATUS'.padEnd(10)} QUOTAS`)
    for (const t of tokens) {
      console.log(`${t.slug.padEnd(20)} ${t.space_id.padEnd(12)} ${t.status.padEnd(10)} deployments:${t.quota_deployments} bytes:${t.quota_bytes}`)
    }

  } else if (sub === 'disable') {
    const flags = parseFlags(rest)
    if (!flags.slug) { console.error('Usage: pagefire token disable --slug <name>'); process.exit(1) }
    const t = getTokenBySlug(db, flags.slug)
    if (!t) { console.error(`Token not found: ${flags.slug}`); process.exit(1) }
    disableToken(db, flags.slug)
    insertAuditLog(db, { token_id: t.id, action: 'token_disable' })
    console.log(`Token '${flags.slug}' disabled.`)

  } else if (sub === 'rotate') {
    const flags = parseFlags(rest)
    if (!flags.slug) { console.error('Usage: pagefire token rotate --slug <name>'); process.exit(1) }
    const t = getTokenBySlug(db, flags.slug)
    if (!t) { console.error(`Token not found: ${flags.slug}`); process.exit(1) }
    const newSpaceId = generateSpaceId(db)
    rotateSpaceId(db, flags.slug, newSpaceId)
    insertAuditLog(db, { token_id: t.id, action: 'token_rotate' })
    console.log(`Token '${flags.slug}' rotated. New space_id: ${newSpaceId}`)
    console.log('Warning: All existing deployment URLs for this token are now invalid.')

  } else if (sub === 'set-space-id') {
    const flags = parseFlags(rest)
    if (!flags.slug || !flags['space-id']) {
      console.error('Usage: pagefire token set-space-id --slug <name> --space-id <custom>')
      process.exit(1)
    }
    const t = getTokenBySlug(db, flags.slug)
    if (!t) { console.error(`Token not found: ${flags.slug}`); process.exit(1) }
    try { validateCustomSpaceId(flags['space-id']) } catch (e) {
      console.error((e as ValidationError).message); process.exit(1)
    }
    try {
      setSpaceIdByTokenId(db, t.id, flags['space-id'])
    } catch (e: any) {
      console.error(e.message ?? String(e)); process.exit(1)
    }
    insertAuditLog(db, { token_id: t.id, action: 'set_space_id' })
    console.log(`Token '${flags.slug}' space_id → ${flags['space-id']}`)
    console.log('Warning: All existing deployment URLs for this token are now invalid.')

  } else {
    console.error('Unknown token subcommand. Use: create, list, disable, rotate, set-space-id')
    process.exit(1)
  }

} else if (cmd === 'gc') {
  const expired = listExpiredDeployments(db)
  if (expired.length === 0) { console.log('No expired deployments to clean up.'); process.exit(0) }
  let cleaned = 0
  for (const d of expired) {
    try {
      deleteDeploymentFiles(config.sites, d.token_id, d.did)
      insertAuditLog(db, { token_id: d.token_id, deployment_id: d.id, action: 'expire' })
      deleteDeploymentRow(db, d.did)
      cleaned++
    } catch (err) {
      console.error(`Failed to clean ${d.did}:`, err)
    }
  }
  console.log(`gc: cleaned ${cleaned}/${expired.length} expired deployments.`)

} else {
  console.log('Usage: pagefire <command>')
  console.log('  token create --slug <name> [--label <text>] [--space-id <custom>]')
  console.log('  token list')
  console.log('  token disable --slug <name>')
  console.log('  token rotate --slug <name>')
  console.log('  token set-space-id --slug <name> --space-id <custom>')
  console.log('  gc')
  process.exit(1)
}

db.close()
