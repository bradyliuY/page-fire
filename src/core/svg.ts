import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'

export function sanitizeSvg(content: string): string | null {
  try {
    const window = new JSDOM('').window
    const purify = DOMPurify(window as any)
    const clean = purify.sanitize(content, {
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
