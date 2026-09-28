import { mkdirSync, writeFileSync, renameSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { randomBytes } from 'crypto'
import { validatePath, validateExtension, validateFileSize } from './validate.js'

const MAX_SINGLE_FILE = 10 * 1024 * 1024 // 10 MB

export interface FileEntry {
  path: string
  content: Buffer | string
}

export interface DeployResult {
  fileCount: number
  sizeBytes: number
}

export function deployFiles(sitesDir: string, tokenId: string, did: string, files: FileEntry[]): DeployResult {
  const liveDir = join(sitesDir, tokenId, did)
  const tmpDir = join(sitesDir, tokenId, '.tmp', `${did}-${randomBytes(4).toString('hex')}`)

  mkdirSync(tmpDir, { recursive: true })

  let totalSize = 0
  try {
    for (const file of files) {
      const destPath = validatePath(file.path, tmpDir)
      validateExtension(file.path)
      const buf = typeof file.content === 'string' ? Buffer.from(file.content, 'utf8') : file.content
      validateFileSize(buf.length, MAX_SINGLE_FILE, file.path)
      totalSize += buf.length
      mkdirSync(dirname(destPath), { recursive: true })
      writeFileSync(destPath, buf)
    }
  } catch (err) {
    // Nothing has touched the live dir yet — the previous version is intact.
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }

  // Swap in place: move the current version aside, rename the new one in, then
  // drop the old copy. Deleting the live dir first would mean a failed swap
  // leaves the deployment with no content at all, so the old version is kept
  // until the new one is actually in place and restored if the swap fails.
  const backupDir = join(sitesDir, tokenId, `${did}.old-${randomBytes(4).toString('hex')}`)
  const hadLive = existsSync(liveDir)

  try {
    if (hadLive) renameSync(liveDir, backupDir)
    mkdirSync(dirname(liveDir), { recursive: true })
    renameSync(tmpDir, liveDir)
  } catch (err) {
    // `rename` is atomic, so a failure leaves the live path either untouched
    // (step 1 failed) or absent (step 2 failed) — only restore in the latter case.
    if (hadLive && !existsSync(liveDir) && existsSync(backupDir)) {
      renameSync(backupDir, liveDir)
    }
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }

  if (existsSync(backupDir)) rmSync(backupDir, { recursive: true, force: true })

  return { fileCount: files.length, sizeBytes: totalSize }
}

export function deleteDeploymentFiles(sitesDir: string, tokenId: string, did: string): void {
  const liveDir = join(sitesDir, tokenId, did)
  if (existsSync(liveDir)) {
    rmSync(liveDir, { recursive: true, force: true })
  }
}
