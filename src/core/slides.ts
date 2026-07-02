import {
  resolveTheme, escapeHtml, stripFrontmatter, type MarkdownTheme, THEMES,
} from './markdown.js'

/**
 * Render Markdown as a remark.js slideshow presentation.
 *
 * Uses `---` as slide separator (standard remark.js syntax).
 * Supports light / dark / sepia themes matching article mode palette.
 *
 * Navigation UI (auto-generated):
 *   - Bottom progress bar
 *   - Bottom-center arrow buttons (◀ / ▶)
 *   - Bottom-right slide counter (3 / 10)
 *   - Keyboard ← →, touch swipe, presenter mode (P), overview (O)
 *
 * remark.min.js is loaded from /__pf__/remark.min.js (same-origin, served
 * by the router) with a CDN fallback.
 */
export function renderMarkdownSlides(
  markdown: string,
  opts: { title?: string; theme?: MarkdownTheme } = {},
): string {
  const theme = resolveTheme(opts.theme)

  // Title: explicit > first ATX heading > default
  let title = opts.title?.trim()
  if (!title) {
    const m = markdown.match(/^\s{0,3}#\s+(.+?)\s*#*\s*$/m)
    if (m) title = m[1].trim()
  }
  title ||= 'Presentation'

  // Strip YAML/TOML frontmatter so `---` isn't mistaken for a slide separator.
  const body = stripFrontmatter(markdown)

  // remark.js reads from <textarea id="source"> as raw text.
  // Only `</textarea>` can break parsing — escape it.
  const safeMd = body.replace(/<\/textarea>/gi, '&lt;/textarea&gt;')

  // Empty body → single placeholder slide.
  const mdContent = body.trim()
    ? safeMd
    : '# No Content\n\n_This presentation has no content._'

  const highlightStyle: Record<MarkdownTheme, string> = {
    light: 'github',
    dark: 'github-dark',
    sepia: 'github',
  }

  const remarkConfig = {
    ratio: '16:9',
    highlightStyle: highlightStyle[theme],
    navigation: { scroll: false, click: true },
    // remark's built-in number; we overlay our own counter but keep
    // remark's for the slide DOM reference.
    slideNumberFormat: '',
    countIncrementalSlides: false,
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{${THEMES[theme]}}
html,body{margin:0;padding:0;height:100%;overflow:hidden;background:var(--bg)}

.remark-slide-content{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif;
  font-size:1.6rem;line-height:1.6;color:var(--fg);background:var(--bg);
  padding:2.5em 3em;display:flex;flex-direction:column;justify-content:center
}
.remark-slide-content h1{font-size:2.3rem;font-weight:720;letter-spacing:-.03em;margin:0 0 .6em;color:var(--fg)}
.remark-slide-content h2{font-size:1.7rem;font-weight:680;margin:0 0 .5em;color:var(--fg)}
.remark-slide-content h3{font-size:1.3rem;font-weight:660;margin:0 0 .4em;color:var(--fg)}
.remark-slide-content h4,.remark-slide-content h5,.remark-slide-content h6{font-size:1.1rem;font-weight:640;margin:0 0 .35em;color:var(--fg)}
.remark-slide-content p{margin:0 0 .8em}
.remark-slide-content ul,.remark-slide-content ol{margin:0 0 .8em;padding-left:1.6em}
.remark-slide-content li{margin:.25em 0}
.remark-slide-content a{color:var(--link);text-decoration:none}
.remark-slide-content a:hover{text-decoration:underline}
.remark-slide-content code{
  font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace;
  background:var(--code-bg);color:var(--code-fg);padding:.12em .35em;border-radius:4px;font-size:.85em
}
.remark-slide-content pre{background:var(--code-bg);border:1px solid var(--bdr);border-radius:8px;padding:12px 14px;overflow-x:auto;margin:0 0 .8em;font-size:.75em;line-height:1.5}
.remark-slide-content pre code{background:none;padding:0;border-radius:0;font-size:inherit}
.remark-slide-content blockquote{margin:0 0 .8em;padding:.2em 1em;color:var(--quote);border-left:3px solid var(--bdr)}
.remark-slide-content table{border-collapse:collapse;margin:0 0 .8em;font-size:.85em;width:100%}
.remark-slide-content th,.remark-slide-content td{border:1px solid var(--bdr);padding:6px 10px;text-align:left}
.remark-slide-content th{background:var(--table-alt);font-weight:660}
.remark-slide-content img{max-width:100%;height:auto;border-radius:6px}
.remark-slide-content .remark-slide-number{font-size:11px;color:var(--muted)}
.remark-slide-content blockquote p:last-child,.remark-slide-content p:last-child{margin-bottom:0}

/* ── Navigation UI ──────────────────────────────────── */

/* Progress bar - thin line across the bottom */
#pf-progress{position:fixed;bottom:0;left:0;height:3px;background:var(--accent);transition:width .25s ease;z-index:100;border-radius:0 2px 2px 0}

/* Bottom bar: arrows + counter */
#pf-bar{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;z-index:100;
  background:var(--bg);border:1px solid var(--bdr);border-radius:20px;padding:4px 6px;opacity:.35;transition:opacity .25s;
  user-select:none;-webkit-user-select:none}
#pf-bar:hover{opacity:.85}
#pf-bar button{background:none;border:none;color:var(--fg);font-size:15px;cursor:pointer;padding:2px 10px;border-radius:8px;line-height:1.5;transition:background .12s}
#pf-bar button:hover{background:var(--code-bg)}
#pf-bar button:disabled{opacity:.2;cursor:default;background:none}
#pf-count{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;min-width:42px;text-align:center;font-family:'SF Mono',ui-monospace,monospace}

/* Hide the native remark slide number */
.remark-slide-number{display:none !important}

/* Print support */
@media print{@page{size:landscape}.remark-slide-scaler{width:100% !important;height:100% !important;left:0 !important;top:0 !important;transform:scale(1) !important}#pf-bar,#pf-progress{display:none !important}}
</style>
</head>
<body>
<textarea id="source" style="display:none">${mdContent}</textarea>

<!-- Navigation UI -->
<div id="pf-progress" style="width:0%"></div>
<div id="pf-bar">
  <button id="pf-prev" onclick="prevSlide()" title="上一页 (←)">◀</button>
  <span id="pf-count">1 / 1</span>
  <button id="pf-next" onclick="nextSlide()" title="下一页 (→)">▶</button>
</div>

<script src="/__pf__/remark.min.js"></script>
<script>
var slideshow = remark.create(${JSON.stringify(remarkConfig)});

// ── UI update on slide change ──────────────────────────
function updateUI(){
  var total = slideshow.getSlideCount() || 1;
  var idx = slideshow.getCurrentSlideIndex() + 1;
  var pct = Math.min(100, (idx / total) * 100);

  document.getElementById('pf-progress').style.width = pct + '%';
  document.getElementById('pf-count').textContent = idx + ' / ' + total;
  document.getElementById('pf-prev').disabled = idx <= 1;
  document.getElementById('pf-next').disabled = idx >= total;
}

slideshow.on('showSlide', updateUI);
// Also run after remark finishes initial layout
setTimeout(updateUI, 100);

// ── Button helpers ────────────────────────────────────
function prevSlide(){ slideshow.gotoPreviousSlide(); }
function nextSlide(){ slideshow.gotoNextSlide(); }
</script>
</body>
</html>`
}
