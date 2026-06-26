import { marked } from 'marked'

export type MarkdownTheme = 'light' | 'dark' | 'sepia'

marked.setOptions({ gfm: true, breaks: true })

// Mermaid diagram detection: by fence lang (```mermaid / ```graph) or by content keyword
// (an untyped fence whose body starts with a diagram type). Such blocks render as live diagrams.
const MERMAID_RE = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|mindmap|journey|gitGraph|quadrantChart|timeline|requirementDiagram|sankey|xychart|block-beta)\b/

marked.use({
  renderer: {
    code(token: { text: string; lang?: string }): string {
      const text = token.text ?? ''
      const langWord = String(token.lang ?? '').trim().toLowerCase().split(/\s+/)[0]
      const isMermaid =
        langWord === 'mermaid' || MERMAID_RE.test(langWord) || (!langWord && MERMAID_RE.test(text.trim()))
      if (isMermaid) return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`
      const cls = langWord ? ` class="language-${escapeHtml(langWord)}"` : ''
      const langAttr = langWord ? ` data-lang="${escapeHtml(langWord)}"` : ''
      return `<pre${langAttr}><code${cls}>${escapeHtml(text)}</code></pre>\n`
    },
  },
})

/** True if rendered HTML contains a mermaid block (→ inject the lib). */
export function hasMermaid(html: string): boolean {
  return html.includes('class="mermaid"')
}

/** Self-hosted mermaid loader: only emitted on pages that actually have a diagram.
 *  Loads from /__pf__/mermaid.min.js (same-origin, served by router) so no CDN needed.
 *  Falls back to jsdelivr CDN redirect if the local file hasn't been downloaded yet. */
export function mermaidScript(theme: MarkdownTheme): string {
  const t = theme === 'dark' ? 'dark' : theme === 'sepia' ? 'neutral' : 'default'
  return `<script src="/__pf__/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: true, theme: ${JSON.stringify(t)} });</script>`
}

export const THEMES: Record<MarkdownTheme, string> = {
  light: `--bg:#ffffff;--fg:#1f2328;--muted:#59636e;--bdr:#d1d9e0;--code-bg:#f6f8fa;--code-fg:#1f2328;--quote:#59636e;--link:#0969da;--accent:#f97316;--table-alt:#f6f8fa`,
  dark:  `--bg:#0d1117;--fg:#e6edf3;--muted:#9198a1;--bdr:#30363d;--code-bg:#161b22;--code-fg:#e6edf3;--quote:#9198a1;--link:#4493f8;--accent:#fb923c;--table-alt:#161b22`,
  sepia: `--bg:#faf4e8;--fg:#433422;--muted:#7c6f5a;--bdr:#e0d4bc;--code-bg:#f1e7d2;--code-fg:#433422;--quote:#7c6f5a;--link:#a8581b;--accent:#c2410c;--table-alt:#f3ead6`,
}

export interface Heading { level: number; text: string; id: string }

export function resolveTheme(theme?: MarkdownTheme): MarkdownTheme {
  return theme && THEMES[theme] ? theme : 'light'
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

// Strip YAML/TOML frontmatter (---...--- or +++...+++) from the top of a Markdown file.
// This makes deploy_markdown compatible with files like Claude Skill .md, Hugo posts, etc.
export function stripFrontmatter(markdown: string): string {
  const m = markdown.match(/^\s*(?:---|\+\+\+)\r?\n([\s\S]*?)\r?\n(?:---|\+\+\+)\r?\n?/)
  return m ? markdown.slice(m[0].length) : markdown
}

// GitHub/Obsidian-style callout/admonition blocks
const CALLOUT_TYPES: Record<string, { label: string; icon: string; cls: string }> = {
  NOTE:      { label: 'Note',      icon: 'ℹ',  cls: 'note' },
  INFO:      { label: 'Info',      icon: 'ℹ',  cls: 'note' },
  TIP:       { label: 'Tip',       icon: '💡', cls: 'tip' },
  HINT:      { label: 'Hint',      icon: '💡', cls: 'tip' },
  IMPORTANT: { label: 'Important', icon: '★',  cls: 'important' },
  ABSTRACT:  { label: 'Abstract',  icon: '◆',  cls: 'abstract' },
  SUMMARY:   { label: 'Summary',   icon: '◆',  cls: 'abstract' },
  TLDR:      { label: 'TL;DR',     icon: '◆',  cls: 'abstract' },
  EXAMPLE:   { label: 'Example',   icon: '▷',  cls: 'example' },
  QUOTE:     { label: 'Quote',     icon: '"',   cls: 'quote' },
  CITE:      { label: 'Cite',      icon: '"',   cls: 'quote' },
  SUCCESS:   { label: 'Success',   icon: '✓',  cls: 'success' },
  CHECK:     { label: 'Check',     icon: '✓',  cls: 'success' },
  DONE:      { label: 'Done',      icon: '✓',  cls: 'success' },
  WARNING:   { label: 'Warning',   icon: '⚠',  cls: 'warning' },
  CAUTION:   { label: 'Caution',   icon: '🔥', cls: 'caution' },
  DANGER:    { label: 'Danger',    icon: '⚡',  cls: 'caution' },
  BUG:       { label: 'Bug',       icon: '🐛', cls: 'caution' },
  QUESTION:  { label: 'Question',  icon: '?',   cls: 'question' },
  HELP:      { label: 'Help',      icon: '?',   cls: 'question' },
  FAQ:       { label: 'FAQ',       icon: '?',   cls: 'question' },
}

function convertCallouts(html: string): string {
  const types = Object.keys(CALLOUT_TYPES).join('|')
  // Case 1: [!TYPE]<br>content (same paragraph – breaks:true)
  html = html.replace(
    new RegExp(`<blockquote>\\s*<p>\\[!(${types})\\]<br>\\n?([\\s\\S]*?)<\\/blockquote>`, 'gi'),
    (_, type, body) => {
      const ct = CALLOUT_TYPES[type.toUpperCase()]; if (!ct) return _
      return `<div class="callout callout-${ct.cls}"><div class="callout-title">${ct.icon} ${ct.label}</div><p>${body.trim()}</div>`
    },
  )
  // Case 2: [!TYPE] is its own paragraph (blank line after type)
  html = html.replace(
    new RegExp(`<blockquote>\\s*<p>\\[!(${types})\\]<\\/p>\\n?([\\s\\S]*?)<\\/blockquote>`, 'gi'),
    (_, type, body) => {
      const ct = CALLOUT_TYPES[type.toUpperCase()]; if (!ct) return _
      return `<div class="callout callout-${ct.cls}"><div class="callout-title">${ct.icon} ${ct.label}</div>${body.trim()}</div>`
    },
  )
  return html
}

// Render Markdown → HTML body, rewriting links to *.md → *.html (for multi-page docs).
export function renderMarkdownBody(markdown: string, rewriteMdLinks = false): string {
  let html = marked.parse(markdown) as string
  if (rewriteMdLinks) {
    html = html.replace(/(href=")([^"]+?)\.md(#[^"]*)?(")/g, '$1$2.html$3$4')
  }
  return convertCallouts(html)
}

// First ATX heading (# ...) as a title.
export function extractTitle(md: string): string | null {
  const m = md.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m)
  return m ? m[1].trim() : null
}

// Generate a URL-safe anchor slug from heading text.
function slugify(text: string): string {
  // Strip inline markdown syntax (bold, italic, code, links)
  const plain = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_]{1,3}([^*_]*)[\*_]{1,3}/g, '$1')
  return plain
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-鿿-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'heading'
}

// Extract h2 and h3 headings from markdown source (preserves document order).
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  const seen = new Map<string, number>()
  for (const m of markdown.matchAll(/^(#{2,3})\s+(.+?)(?:\s+#+)?\s*$/gm)) {
    const level = m[1].length
    const text = m[2].trim()
    let id = slugify(text)
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`
    headings.push({ level, text, id })
  }
  return headings
}

// Inject id attributes into h2/h3 tags in rendered HTML (matched by document order).
export function injectHeadingIds(html: string, headings: Heading[]): string {
  let idx = 0
  return html.replace(/<(h[23])>/g, (_, tag) => {
    const h = headings[idx]
    if (!h) return `<${tag}>`
    idx++
    return `<${tag} id="${h.id}">`
  })
}

// Build the right-side TOC HTML + CSS + JS for embedding in a page.
// Returns empty string if fewer than 2 headings (no point showing a TOC).
export function renderTocPanel(headings: Heading[], minBreakpoint = 1100): string {
  if (headings.length < 2) return ''
  const items = headings.map(h => {
    const indent = h.level === 3 ? ' style="padding-left:14px"' : ''
    return `<a href="#${h.id}"${indent}>${escapeHtml(h.text)}</a>`
  }).join('\n')
  return `<button class="toc-reopen" onclick="document.body.classList.remove('toc-hidden')" aria-label="展开目录">‹ 目录</button>
<div class="toc-wrap">
<div class="toc-head"><span class="toc-label">目录</span><button class="toc-x" onclick="document.body.classList.add('toc-hidden')" title="收起目录" aria-label="收起目录">›</button></div>
<nav class="toc" aria-label="页内目录">
${items}
</nav>
</div>
<style>
.toc-wrap{position:fixed;top:56px;right:24px;width:190px;max-height:calc(100vh - 80px);
  overflow-y:auto;display:none;scrollbar-width:none}
.toc-wrap::-webkit-scrollbar{display:none}
.toc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-left:8px}
.toc-x,.toc-reopen{border:1px solid var(--bdr);background:var(--bg);color:var(--muted);
  cursor:pointer;line-height:1;transition:color .12s,background .12s}
.toc-x{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:15px}
.toc-x:hover,.toc-reopen:hover{color:var(--fg);background:var(--table-alt)}
.toc-reopen{display:none;position:fixed;top:56px;right:0;padding:7px 11px;font-size:11.5px;
  border-radius:8px 0 0 8px;border-right:none;z-index:15}
@media(min-width:${minBreakpoint}px){
  .toc-wrap{display:block}
  body.toc-hidden .toc-wrap{display:none}
  body.toc-hidden .toc-reopen{display:block}
}
.toc-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--muted)}
.toc a{display:block;color:var(--muted);font-size:12.5px;text-decoration:none;
  padding:4px 8px;border-radius:5px;line-height:1.45;transition:color .1s,background .1s;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toc a:hover{color:var(--fg);background:var(--table-alt)}
.toc a.toc-active{color:var(--accent);font-weight:600}
</style>
<script>
(function(){
  var links=[].slice.call(document.querySelectorAll('.toc a'))
  if(!links.length)return
  var io=new IntersectionObserver(function(entries){
    for(var i=0;i<entries.length;i++){
      if(entries[i].isIntersecting){
        links.forEach(function(l){l.classList.remove('toc-active')})
        var a=document.querySelector('.toc a[href="#'+entries[i].target.id+'"]')
        if(a)a.classList.add('toc-active')
      }
    }
  },{rootMargin:'-10% 0px -75% 0px'})
  document.querySelectorAll('h2[id],h3[id]').forEach(function(h){io.observe(h)})
})()
</script>`
}

export function renderMarkdownPage(
  markdown: string,
  opts: { title?: string; theme?: MarkdownTheme } = {},
): string {
  const theme = resolveTheme(opts.theme)
  const stripped = stripFrontmatter(markdown)
  const headings = extractHeadings(stripped)
  const rawBody = renderMarkdownBody(stripped)
  const bodyHtml = injectHeadingIds(rawBody, headings)
  const title = opts.title?.trim() || extractTitle(stripped) || 'Document'
  const toc = renderTocPanel(headings, 1100)

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
:root{${THEMES[theme]};--maxw:740px}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif;
  font-size:16px;line-height:1.75;-webkit-font-smoothing:antialiased}
.md{max-width:var(--maxw);margin:0 auto;padding:64px 24px 120px}
/* when the right TOC is shown, reserve its width so the content stays centered in the visible band */
@media(min-width:1100px){body.has-toc{padding-right:214px}body.has-toc.toc-hidden{padding-right:0}}
.md>*:first-child{margin-top:0}
h1,h2,h3,h4,h5,h6{margin:2em 0 .7em;line-height:1.3;font-weight:650;letter-spacing:-.01em}
h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid var(--bdr)}
h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid var(--bdr)}
h3{font-size:1.25em}h4{font-size:1em}h5{font-size:.9em}h6{font-size:.85em;color:var(--muted)}
p{margin:0 0 1.1em}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
ul,ol{margin:0 0 1.1em;padding-left:1.7em}li{margin:.3em 0}
li>ul,li>ol{margin:.3em 0}
blockquote{margin:0 0 1.1em;padding:.2em 1.1em;color:var(--quote);border-left:3px solid var(--bdr)}
blockquote>*:last-child{margin-bottom:0}
hr{border:none;border-top:1px solid var(--bdr);margin:2.4em 0}
img{max-width:100%;height:auto;border-radius:8px}
.mermaid{margin:0 0 1.2em;text-align:center;overflow-x:auto}
.mermaid svg{max-width:100%;height:auto}
code{font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace;font-size:.88em;
  background:var(--code-bg);color:var(--code-fg);padding:.18em .4em;border-radius:5px}
pre{background:var(--code-bg);border:1px solid var(--bdr);border-radius:10px;
  padding:16px 18px;overflow-x:auto;margin:0 0 1.2em;line-height:1.6}
pre code{background:none;padding:0;font-size:.85em}
table{border-collapse:collapse;width:100%;margin:0 0 1.2em;display:block;overflow-x:auto}
th,td{border:1px solid var(--bdr);padding:8px 13px;text-align:left}
th{font-weight:650;background:var(--table-alt)}
tr:nth-child(2n) td{background:var(--table-alt)}
input[type=checkbox]{appearance:none;-webkit-appearance:none;width:14px;height:14px;
  border:1.5px solid var(--bdr);border-radius:3px;vertical-align:middle;margin-right:6px;
  position:relative;top:-1px;flex-shrink:0;background:var(--bg);transition:background .1s,border-color .1s}
input[type=checkbox]:checked{background:var(--link);border-color:var(--link)}
input[type=checkbox]:checked::after{content:'✓';position:absolute;color:#fff;font-size:9px;left:1px;top:-2px;font-weight:bold}
mark{background:#fff3b3;color:inherit;border-radius:3px;padding:.1em .2em}
del{color:var(--muted);text-decoration:line-through}
ins{text-decoration:underline;text-underline-offset:3px}
details{margin:0 0 1.2em;border:1px solid var(--bdr);border-radius:8px;overflow:hidden}
summary{padding:10px 14px;cursor:pointer;font-weight:600;user-select:none;background:var(--table-alt)}
details[open] summary{border-bottom:1px solid var(--bdr)}
details>*:not(summary){padding:0 14px}details>p{margin-top:.8em}
abbr[title]{text-decoration:underline dotted;cursor:help}
pre[data-lang]::before{content:attr(data-lang);display:block;text-align:right;font-size:11px;
  color:var(--muted);margin-bottom:8px;font-family:inherit;font-weight:600;letter-spacing:.03em}
.callout{margin:0 0 1.2em;padding:10px 14px;border-radius:8px;border-left:4px solid}
.callout-title{margin:0 0 4px;font-weight:650;font-size:.88em;display:flex;align-items:center;gap:5px}
.callout p:last-child,.callout>*:last-child{margin-bottom:0}
.callout-note{background:rgba(9,105,218,.08);border-color:#0969da}
.callout-tip{background:rgba(26,127,55,.08);border-color:#1a7f37}
.callout-success{background:rgba(26,127,55,.08);border-color:#1a7f37}
.callout-important{background:rgba(130,80,223,.08);border-color:#8250df}
.callout-abstract{background:rgba(0,150,199,.08);border-color:#0096c7}
.callout-example{background:rgba(130,80,223,.08);border-color:#8250df}
.callout-quote{background:rgba(100,100,100,.07);border-color:#888}
.callout-question{background:rgba(249,115,22,.08);border-color:#f97316}
.callout-warning{background:rgba(154,103,0,.1);border-color:#9a6700}
.callout-caution{background:rgba(207,34,46,.08);border-color:#cf222e}
kbd{font-family:'SF Mono',monospace;font-size:.82em;background:var(--code-bg);
  border:1px solid var(--bdr);border-bottom-width:2px;border-radius:5px;padding:.1em .5em}
.md-footer{max-width:var(--maxw);margin:0 auto;padding:0 24px 48px;color:var(--muted);
  font-size:12.5px;border-top:1px solid var(--bdr);margin-top:-72px;padding-top:24px}
.md-footer a{color:var(--accent)}
@media(max-width:600px){.md{padding:40px 18px 90px}body{font-size:15.5px}}
</style>
</head>
<body class="${toc ? 'has-toc' : ''}">
<article class="md">
${bodyHtml}
</article>
<div class="md-footer">由 <a href="https://pagefire.openhkt.com">PageFire</a> 渲染发布 · Markdown</div>
${toc}
${hasMermaid(bodyHtml) ? mermaidScript(theme) : ''}
</body>
</html>`
}
