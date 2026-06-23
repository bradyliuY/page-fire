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
      validateFileSize(buf.length, MAX_SINGLE_FILE)
      totalSize += buf.length
      mkdirSync(dirname(destPath), { recursive: true })
      writeFileSync(destPath, buf)
    }

    // Remove existing live dir if any (for redeploy)
    if (existsSync(liveDir)) {
      rmSync(liveDir, { recursive: true, force: true })
    }
    mkdirSync(dirname(liveDir), { recursive: true })
    renameSync(tmpDir, liveDir)

    return { fileCount: files.length, sizeBytes: totalSize }
  } catch (err) {
    // Cleanup tmp on failure
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
    throw err
  }
}

export function deleteDeploymentFiles(sitesDir: string, tokenId: string, did: string): void {
  const liveDir = join(sitesDir, tokenId, did)
  if (existsSync(liveDir)) {
    rmSync(liveDir, { recursive: true, force: true })
  }
}
