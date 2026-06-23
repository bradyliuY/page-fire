import { marked } from 'marked'

export type MarkdownTheme = 'light' | 'dark' | 'sepia'

marked.setOptions({ gfm: true, breaks: false })

const THEMES: Record<MarkdownTheme, string> = {
  light: `--bg:#ffffff;--fg:#1f2328;--muted:#59636e;--bdr:#d1d9e0;--code-bg:#f6f8fa;--code-fg:#1f2328;--quote:#59636e;--link:#0969da;--accent:#f97316;--table-alt:#f6f8fa`,
  dark:  `--bg:#0d1117;--fg:#e6edf3;--muted:#9198a1;--bdr:#30363d;--code-bg:#161b22;--code-fg:#e6edf3;--quote:#9198a1;--link:#4493f8;--accent:#fb923c;--table-alt:#161b22`,
  sepia: `--bg:#faf4e8;--fg:#433422;--muted:#7c6f5a;--bdr:#e0d4bc;--code-bg:#f1e7d2;--code-fg:#433422;--quote:#7c6f5a;--link:#a8581b;--accent:#c2410c;--table-alt:#f3ead6`,
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

export function renderMarkdownPage(
  markdown: string,
  opts: { title?: string; theme?: MarkdownTheme } = {},
): string {
  const theme = opts.theme && THEMES[opts.theme] ? opts.theme : 'light'
  const bodyHtml = marked.parse(markdown) as string
  const title = opts.title?.trim() || extractTitle(markdown) || 'Document'

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
kbd{font-family:'SF Mono',monospace;font-size:.82em;background:var(--code-bg);
  border:1px solid var(--bdr);border-bottom-width:2px;border-radius:5px;padding:.1em .5em}
.md-footer{max-width:var(--maxw);margin:0 auto;padding:0 24px 48px;color:var(--muted);
  font-size:12.5px;border-top:1px solid var(--bdr);margin-top:-72px;padding-top:24px}
.md-footer a{color:var(--accent)}
@media(max-width:600px){.md{padding:40px 18px 90px}body{font-size:15.5px}}
</style>
</head>
<body>
<article class="md">
${bodyHtml}
</article>
<div class="md-footer">由 <a href="https://pagefire.openhkt.com">PageFire</a> 渲染发布 · Markdown</div>
</body>
</html>`
}

// First ATX heading (# ...) as a title fallback.
function extractTitle(md: string): string | null {
  const m = md.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m)
  return m ? m[1].trim() : null
}
