import JSZip from 'jszip'
import { renderMarkdownSlides } from '../slides.js'

import type { FileEntry } from '../deploy.js'
import type { MarkdownTheme } from '../markdown.js'

const MEDIA_RE = /^ppt\/media\//i

/**
 * Result of converting a PPTX file to deployable files.
 */
export interface PptxConversion {
  files: FileEntry[]
  title: string
  slideCount: number
}

/**
 * Convert a PowerPoint (.pptx) buffer into a deployable set of files.
 *
 * - Extracts text from every slide (preserving order)
 * - Extracts images and stores them alongside
 * - Renders the content as a remark.js slideshow via `renderMarkdownSlides()`
 * - Keeps the original PPTX as a downloadable file
 */
export async function convertPptx(
  pptxBuffer: Buffer,
  opts: { title?: string; theme?: MarkdownTheme } = {},
): Promise<PptxConversion> {
  const zip = await JSZip.loadAsync(pptxBuffer)

  // ── 1. Extract images ──────────────────────────────────────────────────
  const imageFiles: FileEntry[] = []
  const imageMap = new Map<string, string>() // original path → images/<name>

  const mediaFiles = zip.file(MEDIA_RE)
  for (const entry of mediaFiles) {
    const rawName = entry.name.replace(/^ppt\/media\//i, '')
    const buf = Buffer.from(await entry.async('arraybuffer'))
    const dest = `images/${rawName}`
    imageFiles.push({ path: dest, content: buf })
    imageMap.set(entry.name, dest)
  }

  // ── 2. Parse slide rels to map rId → image target ──────────────────────
  // Returns an array where relsBySlide[i] = Map<rId, relativeImagePath>
  const slideCount = countSlides(zip)
  const relsBySlide: Map<string, string>[] = []
  for (let i = 1; i <= slideCount; i++) {
    const rels = await parseSlideImageRels(zip, i, imageMap)
    relsBySlide.push(rels)
  }

  // ── 3. Parse each slide XML for text + used image rIds ────────────────
  const slides: { text: string; imageRefs: string[] }[] = []
  for (let i = 1; i <= slideCount; i++) {
    const slideFile = zip.file(`ppt/slides/slide${i}.xml`)
    if (!slideFile) { slides.push({ text: '', imageRefs: [] }); continue }

    const xml = await slideFile.async('string')
    const text = extractSlideText(xml)
    const imageRefs = extractImageRids(xml).map(rId => relsBySlide[i - 1]?.get(rId)).filter(Boolean) as string[]
    slides.push({ text, imageRefs })
  }

  // ── 4. Build markdown ─────────────────────────────────────────────────
  const parts: string[] = []
  for (const s of slides) {
    const trimmed = s.text.trim()
    if (!trimmed && s.imageRefs.length === 0) continue // skip empty slides
    if (trimmed) parts.push(trimmed)
    for (const imgPath of s.imageRefs) {
      const name = imgPath.replace(/^images\//, '')
      parts.push(`![${name}](${imgPath})`)
    }
  }

  // If no text at all, show a placeholder.
  const markdown = parts.length > 0 ? parts.join('\n\n---\n\n') : '# Empty Presentation\n\n_This PPTX file has no extractable content._'

  // ── 5. Determine title ────────────────────────────────────────────────
  let title = opts.title?.trim()
  if (!title) {
    // Try first slide's first line as title
    const firstSlide = slides[0]?.text.trim()
    if (firstSlide) {
      const firstLine = firstSlide.split('\n')[0].replace(/^#+\s*/, '')
      if (firstLine) title = firstLine
    }
  }
  title ||= 'Presentation'

  // ── 6. Render slides ──────────────────────────────────────────────────
  const slideHtml = renderMarkdownSlides(markdown, { title, theme: opts.theme })

  // ── 7. Assemble deployment files ──────────────────────────────────────
  const files: FileEntry[] = [
    { path: 'index.html', content: slideHtml },
    // Keep original PPTX downloadable
    { path: `${title}.pptx`, content: pptxBuffer },
    ...imageFiles,
  ]

  return { files, title, slideCount: slides.length }
}

// ── helpers ───────────────────────────────────────────────────────────────

/** Count slides by checking for ppt/slides/slide{N}.xml files. */
function countSlides(zip: JSZip): number {
  let n = 0
  zip.file(/^ppt\/slides\/slide\d+\.xml$/).forEach(() => n++)
  return n
}

/** Extract text content from a slide XML (<a:t> elements). */
function extractSlideText(xml: string): string {
  const texts: string[] = []
  // Match all <a:t>...</a:t> elements
  const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const raw = match[1]
    // Decode XML entities
    const text = raw
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x0D;/g, '')
      .trim()
    if (text) texts.push(text)
  }

  if (texts.length === 0) return ''

  // Heuristic: first text in the slide is the title → prepend `# `
  // Subsequent texts are body paragraphs.
  const title = texts[0]
  const body = texts.slice(1).filter(Boolean)

  const lines: string[] = [`# ${title}`]
  for (const p of body) {
    // Detect bullet-ish text (starts with •, -, *, or numbered list)
    if (/^[•\-\*\d+\.]\s/.test(p)) {
      lines.push(p)
    } else {
      lines.push('')
      lines.push(p)
    }
  }
  return lines.join('\n')
}

/** Extract rId attributes from <a:blip r:embed="…"> elements. */
function extractImageRids(xml: string): string[] {
  const rids: string[] = []
  const regex = /<a:blip[^>]*\sr:embed="([^"]+)"/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    if (!rids.includes(match[1])) rids.push(match[1])
  }
  return rids
}

/** Parse slide .rels file to build rId → image path mapping. */
async function parseSlideImageRels(
  zip: JSZip, slideIndex: number, imageMap: Map<string, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`
  const relsFile = zip.file(relsPath)
  if (!relsFile) return map

  const xml = await relsFile.async('string')
  // Match <Relationship Id="rId2" Type="…image…" Target="../media/image1.png"/>
  const regex = /<Relationship\s+Id="([^"]+)"\s+Type="[^"]*[Ii]mage[^"]*"\s+Target="([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    const rId = match[1]
    // Target is relative like "../media/image1.png" — resolve to "ppt/media/image1.png"
    const rawTarget = match[2].replace(/^\.\.\//, 'ppt/')
    const resolved = imageMap.get(rawTarget)
    if (resolved) map.set(rId, resolved)
  }
  return map
}
