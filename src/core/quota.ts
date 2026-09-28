import type Database from 'better-sqlite3'
import { ValidationError } from './validate.js'

/**
 * 新 token 的**默认**配额。
 *
 * 注意措辞:实际限额是**按 token** 存在 `tokens.quota_deployments` / `tokens.quota_bytes`
 * 列里的,管理员可以给单个 token 提升,`checkQuota` 读的也是那两列 —— 所以这里是
 * 「创建时的默认值」,不是全局上限。
 *
 * 这两条以前在 CLI 与控制台各硬编码了一遍(值相同,但会各自漂移),统一到这里。
 * 建表语句里的 `DEFAULT` 是第三份,只在直接 INSERT 不带值时生效 —— 应用两条创建路径
 * 都显式传值,所以那份实际用不到,改这里就够。
 */
export const DEFAULT_QUOTA_DEPLOYMENTS = 100
export const DEFAULT_QUOTA_BYTES = 200 * 1024 * 1024

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
