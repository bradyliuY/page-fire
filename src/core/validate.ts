import { resolve, extname, normalize } from 'path'

export const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.png', '.jpg', '.jpeg',
  '.gif', '.svg', '.webp', '.ico', '.woff2', '.json', '.txt', '.md', '.map',
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
