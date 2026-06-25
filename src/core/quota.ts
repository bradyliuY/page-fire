import type Database from 'better-sqlite3'
import { ValidationError } from './validate.js'

export interface QuotaStatus {
  usedDeployments: number; maxDeployments: number
  usedBytes: number; maxBytes: number
}

export function checkQuota(db: Database.Database, tokenId: string, newBytes: number): QuotaStatus {
  const token = db.prepare('SELECT quota_deployments, quota_bytes FROM tokens WHERE id = ?').get(tokenId) as { quota_deployments: number; quota_bytes: number } | undefined
  if (!token) throw new ValidationError('UNAUTHORIZED', 'Token not found')

  const stats = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes), 0) as total FROM deployments WHERE token_id = ? AND (pinned = 1 OR expires_at IS NULL OR expires_at > ?)`).get(tokenId, Date.now()) as { cnt: number; total: number }

  if (stats.cnt >= token.quota_deployments) {
    throw new ValidationError('QUOTA_EXCEEDED', `Deployment quota exceeded: ${stats.cnt}/${token.quota_deployments}`)
  }
  if (stats.total + newBytes > token.quota_bytes) {
    throw new ValidationError('QUOTA_EXCEEDED', `Storage quota exceeded: ${stats.total + newBytes}/${token.quota_bytes} bytes`)
  }
  return { usedDeployments: stats.cnt, maxDeployments: token.quota_deployments, usedBytes: stats.total, maxBytes: token.quota_bytes }
}
