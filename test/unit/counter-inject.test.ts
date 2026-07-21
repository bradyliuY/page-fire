import { describe, it, expect } from 'vitest'

interface PageMeta {
  views: number
  created_at?: number
  updated_at?: number
  author?: string | null
}

function fmtDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function buildMetaBarParts(m: PageMeta): string[] {
  const parts: string[] = []
  if (m.author) parts.push(`<span>${m.author}</span>`)
  if (m.created_at) parts.push(`<span>${fmtDate(m.created_at)}</span>`)
  if (m.updated_at && m.updated_at !== m.created_at) parts.push(`<span>更新 ${fmtDate(m.updated_at)}</span>`)
  return parts
}

function captureInjection(html: string, meta: PageMeta): string {
  const label = meta.views.toLocaleString()
  const counterSpan = `<span id="pf-cnt">👁 ${label}</span>`
  const script = `<script>fetch('/_pf/counter',{method:'POST'}).then(function(r){return r.json()}).then(function(j){var s=document.getElementById('pf-cnt');if(s)s.textContent='\\uD83D\\uDC41 '+j.views.toLocaleString()+' views'})</script>`

  let result = html
  const isPfFooter = result.includes('class="md-footer"') || result.includes('class="doc-footer"')

  if (isPfFooter) {
    // Meta bar — below first <h1>
    const articleTag = 'class="md">'
    const aIdx = result.indexOf(articleTag)
    if (aIdx !== -1) {
      const afterArticle = result.indexOf('>', aIdx) + 1
      const h1Start = result.indexOf('<h1', afterArticle)
      if (h1Start !== -1 && h1Start - afterArticle < 2000) {
        const h1Close = result.indexOf('</h1>', h1Start)
        if (h1Close !== -1) {
          const parts = buildMetaBarParts(meta)
          parts.push(counterSpan)
          const bar = `<div style="display:flex;gap:8px 16px;flex-wrap:wrap;font:13.5px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:.01em;color:var(--muted,#59636e);padding:3px 0 8px;margin:0 0 14px;border-bottom:1px solid var(--bdr,#d1d9e0)">${parts.join('')}</div>`
          result = result.slice(0, h1Close + 5) + '\n' + bar + result.slice(h1Close + 5)
        }
      }
    }
    // Footer — append counter inline
    for (const cls of ['class="md-footer">', 'class="doc-footer">']) {
      const idx = result.indexOf(cls)
      if (idx !== -1) {
        const closeDiv = result.indexOf('</div>', idx + cls.length)
        if (closeDiv !== -1) {
          result = result.slice(0, closeDiv) + ` · ${counterSpan}` + result.slice(closeDiv)
          break
        }
      }
    }
  } else {
    let injected = false
    const fm = result.match(/<footer[\s>]/i)
    if (fm) {
      const endFooter = result.toLowerCase().indexOf('</footer>', fm.index!)
      if (endFooter !== -1) {
        result = result.slice(0, endFooter) +
          `<div style="text-align:center;font:12px/1.5 system-ui,sans-serif;color:#999;padding:2px 0 4px">${counterSpan}</div>\n` +
          result.slice(endFooter)
        injected = true
      }
    }
    if (!injected) {
      const elemMatch = result.match(/<(div|section|aside)\s+[^>"]*"(?:[^"]*)?footer(?:[^"]*)?"[^>]*>/i)
      if (elemMatch) {
        const closeDiv = result.indexOf('</div>', elemMatch.index! + elemMatch[0].length)
        if (closeDiv !== -1) {
          result = result.slice(0, closeDiv) + `\n<div style="text-align:center;font:12px/1.5 system-ui,sans-serif;color:#999">${counterSpan}</div>` + result.slice(closeDiv)
          injected = true
        }
      }
    }
    if (!injected) {
      const bodyIdx = result.lastIndexOf('</body>')
      const block = `<div style="display:block;text-align:center;padding:6px 4px 16px;font:12px/1.5 system-ui,-apple-system,sans-serif;color:#999;letter-spacing:.01em">${counterSpan}</div>`
      if (bodyIdx !== -1) {
        result = result.slice(0, bodyIdx) + block + result.slice(bodyIdx)
      } else {
        result += block
      }
    }
  }

  const bodyIdx = result.lastIndexOf('</body>')
  if (bodyIdx !== -1) {
    result = result.slice(0, bodyIdx) + script + result.slice(bodyIdx)
  } else {
    result += script
  }
  return result
}

const NOW = Date.UTC(2026, 6, 19, 12, 0, 0)

describe('PageFire MD/doc pages — meta bar below <h1>', () => {
  it('injects meta bar below first <h1> with author + date + counter', () => {
    const html = '<!doctype html><html><body><article class="md"><h1>文章标题</h1><p>正文</p></article><div class="md-footer">由 PageFire 渲染发布 · Markdown</div></body></html>'
    const result = captureInjection(html, { views: 1428, created_at: NOW, author: '张三' })
    // Meta bar below </h1>
    expect(result).toMatch(/<\/h1>\n<div style="display:flex.*"><span>张三<\/span><span>2026-07-19<\/span><span id="pf-cnt">👁 1,428<\/span><\/div>/)
    // Footer: counter inline
    expect(result).toContain('Markdown · <span id="pf-cnt">👁 1,428</span></div>')
  })

  it('shows update date when different from create date', () => {
    const html = '<!doctype html><html><body><article class="md"><h1>Title</h1></article><div class="md-footer">F</div></body></html>'
    const next = NOW + 86400000
    const result = captureInjection(html, { views: 10, created_at: NOW, updated_at: next, author: '测试' })
    expect(result).toContain('<span>测试</span><span>2026-07-19</span><span>更新 2026-07-20</span>')
    expect(result).toContain('<span id="pf-cnt">👁 10</span>')
  })

  it('handles null author gracefully', () => {
    const html = '<!doctype html><html><body><article class="md"><h1>T</h1></article><div class="md-footer">F</div></body></html>'
    const result = captureInjection(html, { views: 42, created_at: NOW, author: null })
    expect(result).toContain('<span>2026-07-19</span>')
    expect(result).not.toContain('null')
    expect(result).toContain('👁 42')
  })

  it('shows only counter when no metadata available', () => {
    const html = '<!doctype html><html><body><article class="md"><h1>T</h1></article><div class="md-footer">F</div></body></html>'
    const result = captureInjection(html, { views: 7 })
    expect(result).toContain('👁 7')
  })

  it('uses eye icon for views', () => {
    const html = '<!doctype html><html><body><article class="md"><h1>T</h1></article><div class="md-footer">F</div></body></html>'
    const result = captureInjection(html, { views: 999 })
    expect(result).toContain('👁 999')
    expect(result).not.toContain('✦')
  })
})

describe('Non-PageFire pages — counter in footer area', () => {
  it('injects inside <footer> element', () => {
    const html = '<!doctype html><html><body><footer>&copy; 2024</footer></body></html>'
    const result = captureInjection(html, { views: 300 })
    expect(result).toMatch(/👁 300<\/span><\/div>\n<\/footer>/)
  })

  it('falls back to before </body> for plain HTML', () => {
    const html = '<!doctype html><html><body><h1>Hello</h1></body></html>'
    const result = captureInjection(html, { views: 0 })
    expect(result).toMatch(/👁 0.*<\/body>/)
  })
})
