import { resolve, extname, normalize } from 'path'

export const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif',
  '.woff', '.woff2', '.ttf', '.eot',
  '.json', '.txt', '.md', '.xml', '.pdf', '.map',
  '.mp4', '.webm',
])

export class ValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validatePath(filePath: string, deployRoot: string): string {
  if (!filePath || filePath.startsWith('/') || filePath.includes('..')) {
    throw new ValidationError('PATH_TRAVERSAL', `Invalid path: ${filePath}`)
  }
  const normalized = normalize(filePath).replace(/\\/g, '/')
  if (normalized.startsWith('/') || normalized.startsWith('..')) {
    throw new ValidationError('PATH_TRAVERSAL', `Path escapes root: ${filePath}`)
  }
  const full = resolve(deployRoot, normalized)
  if (!full.startsWith(resolve(deployRoot))) {
    throw new ValidationError('PATH_TRAVERSAL', `Path escapes deployment root: ${filePath}`)
  }
  return full
}

export function validateExtension(filename: string): void {
  const ext = extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ValidationError('FORBIDDEN_EXTENSION', `File extension not allowed: ${ext}`)
  }
}

export function validateFileSize(bytes: number, limit: number): void {
  if (bytes > limit) {
    throw new ValidationError('FILE_TOO_LARGE', `File size ${bytes} exceeds limit ${limit}`)
  }
}

const SPACE_ID_RE = /^[a-z0-9][a-z0-9-]{2,18}[a-z0-9]$/
const SPACE_ID_RESERVED = new Set([
  'www', 'api', 'mcp', 'admin', 'root', 'mail', 'ftp', 'smtp', 'imap',
  'pop', 'ns1', 'ns2', 'cdn', 'git', 'static', 'assets', 'media',
  'app', 'web', 'docs', 'help', 'support', 'status', 'dashboard',
])

export function validateCustomSpaceId(id: string): void {
  if (!SPACE_ID_RE.test(id)) {
    throw new ValidationError(
      'INVALID_SPACE_ID',
      'space_id must be 4–20 chars, only [a-z0-9-], cannot start/end with "-"',
    )
  }
  if (id.includes('--')) {
    throw new ValidationError('INVALID_SPACE_ID', 'space_id cannot contain consecutive hyphens "--"')
  }
  if (SPACE_ID_RESERVED.has(id)) {
    throw new ValidationError('INVALID_SPACE_ID', `"${id}" is a reserved name`)
  }
}
