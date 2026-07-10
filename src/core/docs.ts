import type { FileEntry } from './deploy.js'
import {
  THEMES, resolveTheme, escapeHtml, renderMarkdownBody, extractTitle, stripFrontmatter,
  extractHeadings, injectHeadingIds, renderTocPanel, hasMermaid, mermaidScript,
  type MarkdownTheme,
} from './markdown.js'

export interface DocInput { path: string; markdown: string }

interface NavItem { href: string; label: string; mdPath: string }

// Extract parent directory from a Markdown path, or empty string for root.
function dirName(mdPath: string): string {
  const idx = mdPath.lastIndexOf('/')
  return idx > 0 ? mdPath.slice(0, idx) : ''
}

// Render sidebar nav with hierarchical grouping by subdirectory.
function renderNav(nav: NavItem[], activeMdPath: string): string {
  // Group by parent directory (preserving nav order within each group)
  const groups = new Map<string, { label: string; items: NavItem[] }>()
  const rootItems: NavItem[] = []
  const seen = new Set<string>()

  for (const item of nav) {
    const dir = dirName(item.mdPath)
    if (dir) {
      if (!seen.has(dir)) {
        seen.add(dir)
        groups.set(dir, { label: dir.split('/').pop() || dir, items: [] })
      }
      groups.get(dir)!.items.push(item)
    } else {
      rootItems.push(item)
    }
  }

  const parts: string[] = []

  for (const item of rootItems) {
    const active = item.mdPath === activeMdPath ? ' class="active"' : ''
    parts.push(`<a href="${escapeHtml(item.href)}"${active}>${escapeHtml(item.label)}</a>`)
  }

  for (const [, g] of groups) {
    parts.push(
      `<div class="nav-dir"><div class="nav-dir-label">${escapeHtml(g.label)}</div>`,
    )
    for (const item of g.items) {
      const active = item.mdPath === activeMdPath ? ' class="active"' : ''
      parts.push(
        `<a href="${escapeHtml(item.href)}"${active} class="nav-sub">${escapeHtml(item.label)}</a>`,
      )
    }
    parts.push('</div>')
  }

  return parts.join('\n')
}

// Render prev / next page navigation buttons.
function navPrevNext(nav: NavItem[], idx: number): string {
  const prev = idx > 0
    ? `<a href="${escapeHtml(nav[idx - 1].href)}">← ${escapeHtml(nav[idx - 1].label)}</a>`
    : '<span class="nav-disabled"></span>'
  const next = idx < nav.length - 1
    ? `<a href="${escapeHtml(nav[idx + 1].href)}" style="text-align:right">${escapeHtml(nav[idx + 1].label)} →</a>`
    : '<span class="nav-disabled"></span>'
  return prev + next
}

/**
 * Build a multi-page Markdown documentation site with left nav sidebar + right TOC.
 * Pure transform: Markdown inputs → static HTML FileEntry[] (no I/O),
 * so it plugs straight into the standard publish() path (did / pin / quota all apply).
 *
 * Entry point fallback (no index.md required):
 *   index.md → README.md → first file in the input array
 * If the entry is not named index.md, a redirect index.html is generated automatically.
 */
export function renderDocsSite(
  inputs: DocInput[],
  opts: { title?: string; theme?: MarkdownTheme } = {},
): FileEntry[] {
  const theme = resolveTheme(opts.theme)
  const siteTitle = opts.title?.trim() || 'Documentation'

  // Normalize + validate paths, derive output html path and nav label.
  const pages = inputs.map((f) => {
    const mdPath = f.path.replace(/^\.?\//, '').trim()
    if (!mdPath.endsWith('.md')) {
      throw { code: 'INVALID_DOC', message: `文档文件必须以 .md 结尾：${f.path}` }
    }
    if (mdPath.includes('..')) {
      throw { code: 'PATH_TRAVERSAL', message: `非法路径：${f.path}` }
    }
    const htmlPath = mdPath.replace(/\.md$/, '.html')
    const stripped = stripFrontmatter(f.markdown)
    const label = extractTitle(stripped) || mdPath.replace(/\.md$/, '').split('/').pop() || mdPath
    return { mdPath, htmlPath, label, markdown: stripped }
  })

  // Determine entry: index.md → README.md → files[0]
  const entryPath =
    pages.find((p) => p.mdPath === 'index.md')?.mdPath ??
    pages.find((p) => p.mdPath === 'README.md')?.mdPath ??
    pages[0].mdPath

  // Nav: entry page first, rest in input order.
  const nav: NavItem[] = pages
    .slice()
    .sort((a, b) => (a.mdPath === entryPath ? -1 : b.mdPath === entryPath ? 1 : 0))
    .map((p) => ({ href: '/' + p.htmlPath, label: p.label, mdPath: p.mdPath }))

  const files: FileEntry[] = pages.map((p) => {
    const idx = nav.findIndex((n) => n.mdPath === p.mdPath)
    return {
      path: p.htmlPath,
      content: renderPage(p.markdown, p.mdPath, p.label, siteTitle, theme, nav, idx, entryPath),
    }
  })

  // If the entry is not index.md, generate a redirect index.html so the root URL works.
  if (entryPath !== 'index.md') {
    const entryHtml = entryPath.replace(/\.md$/, '.html')
    files.push({
      path: 'index.html',
      content: `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting…</title>`
        + `<meta http-equiv="refresh" content="0;url=/${entryHtml}"></head>`
        + `<body><script>location.replace('/${entryHtml}')</script></body></html>`,
    })
  }

  return files
}

function renderPage(
  markdown: string, mdPath: string, pageLabel: string,
  siteTitle: string, theme: MarkdownTheme, nav: NavItem[], navIndex: number, entryPath: string,
): string {
  const headings = extractHeadings(markdown)
  const rawBody = renderMarkdownBody(markdown, /* rewriteMdLinks */ true)
  const body = injectHeadingIds(rawBody, headings)
  const toc = renderTocPanel(headings, 1280)

  const navHtml = renderNav(nav, mdPath)
  const docTitle = mdPath === entryPath ? siteTitle : `${pageLabel} · ${siteTitle}`

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
<style>
*,*::before,*::after{box-sizing:border-box}
:root{${THEMES[theme]};--sbw:268px;--maxw:780px}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif;
  font-size:16px;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
/* left nav sidebar */
.sidebar{position:fixed;top:0;left:0;bottom:0;width:var(--sbw);overflow-y:auto;
  border-right:1px solid var(--bdr);padding:26px 18px;background:var(--bg)}
.site-title{font-size:15px;font-weight:680;letter-spacing:-.2px;margin:0 8px 18px;
  display:flex;align-items:center;gap:8px}
.site-title .fl{width:24px;height:24px;border-radius:6px;background:rgba(249,115,22,.12);
  border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:12px}
.sidebar nav{display:flex;flex-direction:column;gap:1px}
.sidebar nav a{color:var(--muted);font-size:13.5px;padding:7px 10px;border-radius:7px;
  text-decoration:none;transition:.12s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar nav a:hover{color:var(--fg);background:var(--table-alt);text-decoration:none}
.sidebar nav a.active{color:var(--accent);background:var(--table-alt);font-weight:600}
/* content */
.content{margin-left:var(--sbw);padding:56px 40px 120px}
.md{max-width:var(--maxw);margin:0 auto}
.md>*:first-child{margin-top:0}
h1,h2,h3,h4,h5,h6{margin:2em 0 .7em;line-height:1.3;font-weight:650;letter-spacing:-.01em}
h1{font-size:2em;padding-bottom:.3em;border-bottom:1px solid var(--bdr)}
h2{font-size:1.5em;padding-bottom:.3em;border-bottom:1px solid var(--bdr)}
h3{font-size:1.25em}h4{font-size:1em}
p{margin:0 0 1.1em}
ul,ol{margin:0 0 1.1em;padding-left:1.7em}li{margin:.3em 0}
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
.doc-footer{margin-top:48px;padding-top:22px;border-top:1px solid var(--bdr);
  color:var(--muted);font-size:12.5px}
.doc-footer a{color:var(--accent)}
.nav-prev-next{display:flex;justify-content:space-between;gap:16px;margin-top:32px;padding-top:20px;border-top:1px solid var(--bdr)}
.nav-prev-next a{font-size:14px;font-weight:600;padding:10px 16px;border-radius:9px;background:var(--table-alt);color:var(--fg);text-decoration:none;transition:.12s;max-width:48%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-prev-next a:hover{background:var(--bdr);text-decoration:none}
.nav-prev-next .nav-disabled{visibility:hidden}
.nav-dir{margin:8px 0 4px}
.nav-dir-label{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:2px 10px;margin-bottom:2px}
.sidebar nav a.nav-sub{padding-left:20px;font-size:13px}
/* mobile */
.menu-btn{display:none;position:fixed;top:14px;left:14px;z-index:30;width:40px;height:40px;
  border-radius:9px;border:1px solid var(--bdr);background:var(--bg);color:var(--fg);
  font-size:18px;cursor:pointer;align-items:center;justify-content:center}
.scrim{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:19}
@media(max-width:860px){
  .menu-btn{display:flex}
  .sidebar{transform:translateX(-100%);transition:transform .2s;z-index:20;width:280px}
  body.nav-open .sidebar{transform:none}
  body.nav-open .scrim{display:block}
  .content{margin-left:0;padding:64px 22px 90px}
}
/* desktop: keep content centered between nav and TOC; collapsible nav + TOC */
@media(min-width:1280px){
  body.has-toc .content{margin-right:214px}
  body.has-toc.toc-hidden .content{margin-right:0}
}
.nav-x{margin-left:auto;flex-shrink:0;width:22px;height:22px;border:1px solid var(--bdr);
  background:var(--bg);color:var(--muted);border-radius:6px;cursor:pointer;display:grid;
  place-items:center;font-size:15px;line-height:1}
.nav-x:hover{color:var(--fg);background:var(--table-alt)}
.nav-reopen{display:none;position:fixed;top:14px;left:14px;z-index:18;align-items:center;
  justify-content:center;width:38px;height:38px;border-radius:9px;border:1px solid var(--bdr);
  background:var(--bg);color:var(--fg);font-size:17px;cursor:pointer}
body.nav-hidden .sidebar{transform:translateX(-100%);transition:transform .2s}
body.nav-hidden .content{margin-left:0}
@media(min-width:861px){body.nav-hidden .nav-reopen{display:flex}}
</style>
</head>
<body class="${toc ? 'has-toc' : ''}">
<button class="menu-btn" onclick="document.body.classList.toggle('nav-open')" aria-label="菜单">☰</button>
<button class="nav-reopen" onclick="document.body.classList.remove('nav-hidden')" aria-label="展开导航">☰</button>
<div class="scrim" onclick="document.body.classList.remove('nav-open')"></div>
<aside class="sidebar">
  <div class="site-title"><span class="fl">📖</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(siteTitle)}</span><button class="nav-x" onclick="document.body.classList.add('nav-hidden')" title="收起导航" aria-label="收起导航">‹</button></div>
  <nav>
${navHtml}
  </nav>
</aside>
<main class="content">
  <article class="md">
${body}
  </article>
  <div class="nav-prev-next">${navPrevNext(nav, navIndex)}</div>
  <div class="doc-footer">由 <a href="https://pagefire.openhkt.com">PageFire</a> 渲染发布 · Docs</div>
</main>
${toc}
${hasMermaid(body) ? mermaidScript(theme) : ''}
</body>
</html>`
}
