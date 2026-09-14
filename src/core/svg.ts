import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'
import { readFileSync } from 'fs'

// Module-level singleton: DOMPurify's documented server-side pattern. Creating
// a full JSDOM window per SVG request cost 5-20ms each; one shared window is
// safe here — Node is single-threaded and sanitize() keeps no state in it.
let purifyInstance: ReturnType<typeof DOMPurify> | null = null

function getPurify(): ReturnType<typeof DOMPurify> {
  if (!purifyInstance) {
    purifyInstance = DOMPurify(new JSDOM('').window as any)
  }
  return purifyInstance
}

function sanitizeWith(content: string): string | null {
  try {
    const clean = getPurify().sanitize(content, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
    })
    if (!clean || clean.trim().length === 0) return null
    return clean
  } catch {
    return null
  }
}

export function sanitizeSvg(content: string): string | null {
  return sanitizeWith(content)
}

// Serve-time memo for sanitized SVGs: DOMPurify output is deterministic per
// file content, and files are immutable between deploys, so mtime is a sound
// invalidation key. Bounded both ways to respect the 200MB PM2 ceiling —
// publish allows 10MB SVGs, so per-entry size matters as much as entry count.
const SVG_MEMO_MAX_ENTRIES = 50
const SVG_MEMO_MAX_INPUT_BYTES = 256 * 1024
const svgMemo = new Map<string, { mtimeMs: number; clean: string }>()

/**
 * Read + sanitize an SVG file with memoization.
 * Falls back to direct sanitizing (no memo) for oversized files, and returns
 * null when the file is missing or sanitizing fails — same contract as sanitizeSvg.
 */
export function sanitizeSvgCached(filePath: string, stat: { mtimeMs: number }): string | null {
  const memoKey = `${filePath}:${Math.floor(stat.mtimeMs)}`
  const hit = svgMemo.get(memoKey)
  if (hit !== undefined) return hit.clean

  let raw: string
  try {
    raw = readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
  const clean = sanitizeWith(raw)
  if (clean !== null && raw.length <= SVG_MEMO_MAX_INPUT_BYTES) {
    svgMemo.set(memoKey, { mtimeMs: stat.mtimeMs, clean })
    // Bound total entries: evict oldest (Map preserves insertion order).
    if (svgMemo.size > SVG_MEMO_MAX_ENTRIES) {
      const oldest = svgMemo.keys().next().value
      if (oldest !== undefined) svgMemo.delete(oldest)
    }
  }
  return clean
}
