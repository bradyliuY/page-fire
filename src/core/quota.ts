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
    throw new ValidationError(
      'QUOTA_EXCEEDED',
      `部署数量已达上限（${stats.cnt}/${token.quota_deployments}）。请删除不需要的站点后再试，或联系管理员提升配额。`,
    )
  }
  if (stats.total + newBytes > token.quota_bytes) {
    const totalMB = (stats.total / 1024 / 1024).toFixed(1)
    const maxMB = (token.quota_bytes / 1024 / 1024).toFixed(0)
    throw new ValidationError(
      'QUOTA_EXCEEDED',
      `存储空间不足（已用 ${totalMB} MB，上限 ${maxMB} MB，新增需要 ${(newBytes / 1024 / 1024).toFixed(1)} MB）。请清理旧站点或联系管理员提升配额。`,
    )
  }
  return { usedDeployments: stats.cnt, maxDeployments: token.quota_deployments, usedBytes: stats.total, maxBytes: token.quota_bytes }
}
