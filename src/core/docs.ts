import type { FileEntry } from './deploy.js'
import {
  THEMES, resolveTheme, escapeHtml, renderMarkdownBody, extractTitle,
  type MarkdownTheme,
} from './markdown.js'

export interface DocInput { path: string; markdown: string }

interface NavItem { href: string; label: string; mdPath: string }

/**
 * Build a multi-page Markdown documentation site with a shared sidebar.
 * Pure transform: Markdown inputs → static HTML FileEntry[] (no I/O),
 * so it plugs straight into the standard publish() path (did / pin / quota all apply).
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
    const label = extractTitle(f.markdown) || mdPath.replace(/\.md$/, '').split('/').pop() || mdPath
    return { mdPath, htmlPath, label, markdown: f.markdown }
  })

  if (!pages.some((p) => p.mdPath === 'index.md')) {
    throw { code: 'MISSING_INDEX', message: '文档站必须包含 index.md 作为首页' }
  }

  // Nav: index first, rest in input order. Root-absolute hrefs (deployment is at subdomain root).
  const nav: NavItem[] = pages
    .slice()
    .sort((a, b) => (a.mdPath === 'index.md' ? -1 : b.mdPath === 'index.md' ? 1 : 0))
    .map((p) => ({ href: '/' + p.htmlPath, label: p.label, mdPath: p.mdPath }))

  return pages.map((p) => ({
    path: p.htmlPath,
    content: renderPage(p.markdown, p.mdPath, p.label, siteTitle, theme, nav),
  }))
}

function renderPage(
  markdown: string, mdPath: string, pageLabel: string,
  siteTitle: string, theme: MarkdownTheme, nav: NavItem[],
): string {
  const body = renderMarkdownBody(markdown, /* rewriteMdLinks */ true)
  const navHtml = nav.map((n) => {
    const active = n.mdPath === mdPath ? ' class="active"' : ''
    return `<a href="${escapeHtml(n.href)}"${active}>${escapeHtml(n.label)}</a>`
  }).join('\n')
  const docTitle = mdPath === 'index.md' ? siteTitle : `${pageLabel} · ${siteTitle}`

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
/* sidebar */
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
code{font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace;font-size:.88em;
  background:var(--code-bg);color:var(--code-fg);padding:.18em .4em;border-radius:5px}
pre{background:var(--code-bg);border:1px solid var(--bdr);border-radius:10px;
  padding:16px 18px;overflow-x:auto;margin:0 0 1.2em;line-height:1.6}
pre code{background:none;padding:0;font-size:.85em}
table{border-collapse:collapse;width:100%;margin:0 0 1.2em;display:block;overflow-x:auto}
th,td{border:1px solid var(--bdr);padding:8px 13px;text-align:left}
th{font-weight:650;background:var(--table-alt)}
tr:nth-child(2n) td{background:var(--table-alt)}
input[type=checkbox]{margin-right:.5em}
.doc-footer{margin-top:48px;padding-top:22px;border-top:1px solid var(--bdr);
  color:var(--muted);font-size:12.5px}
.doc-footer a{color:var(--accent)}
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
</style>
</head>
<body>
<button class="menu-btn" onclick="document.body.classList.toggle('nav-open')" aria-label="菜单">☰</button>
<div class="scrim" onclick="document.body.classList.remove('nav-open')"></div>
<aside class="sidebar">
  <div class="site-title"><span class="fl">📖</span>${escapeHtml(siteTitle)}</div>
  <nav>
${navHtml}
  </nav>
</aside>
<main class="content">
  <article class="md">
${body}
  </article>
  <div class="doc-footer">由 <a href="https://pagefire.openhkt.com">PageFire</a> 渲染发布 · Docs</div>
</main>
</body>
</html>`
}
