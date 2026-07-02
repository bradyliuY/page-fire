import { escapeHtml, resolveTheme, type MarkdownTheme, THEMES } from '../markdown.js'
import type { FileEntry } from '../deploy.js'

export interface PdfViewerOpts {
  /** Filename for the PDF inside the deployment (default: document.pdf). */
  pdfFileName?: string
  /** Page title (default: extracted from pdfFileName). */
  title?: string
  /** Theme — matches article mode palette (default: light). */
  theme?: MarkdownTheme
}

/**
 * Wrap a PDF binary into a deployment-ready file list.
 *
 * The PDF is stored as a static file alongside an index.html that embeds it
 * via the browser's native `<iframe>` PDF viewer.  The viewer supports:
 *   - keyboard ⎗ / ⎘ navigation
 *   - page input (where the native viewer exposes it)
 *   - zoom controls
 *   - download button
 *
 * For browsers without native PDF support the `<iframe>` also works as a
 * graceful fallback (most show a download prompt).
 */
export function wrapPdfViewer(pdfBuffer: Buffer, opts: PdfViewerOpts = {}): FileEntry[] {
  const pdfFileName = opts.pdfFileName || 'document.pdf'
  const title = opts.title?.trim() || pdfFileName.replace(/\.pdf$/i, '') || 'PDF Document'
  const theme = resolveTheme(opts.theme)

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDF: ${escapeHtml(title)}</title>
<style>
:root{${THEMES[theme]}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,'PingFang SC','Microsoft YaHei',sans-serif}
.tb{display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--bg);border-bottom:1px solid var(--bdr);flex-wrap:wrap;flex-shrink:0}
.tb-title{font-size:14px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg)}
.tb a,.tb button{background:var(--code-bg);border:1px solid var(--bdr);border-radius:6px;padding:5px 10px;color:var(--fg);font-size:12.5px;cursor:pointer;transition:.12s;text-decoration:none;font-family:inherit}
.tb a:hover,.tb button:hover{background:var(--table-alt)}
.tb .sep{color:var(--muted);font-size:12px}
#frame-wrap{flex:1;position:relative}
#iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
.hint{font-size:11px;color:var(--muted);text-align:center;padding:4px 0}
.hint kbd{font-family:inherit;background:var(--code-bg);padding:1px 6px;border-radius:4px;border:1px solid var(--bdr);font-size:10.5px}
</style>
</head>
<body style="display:flex;flex-direction:column;height:100vh">
<div class="tb">
  <span class="tb-title">${escapeHtml(title)}</span>
  <a href="${escapeHtml(pdfFileName)}" download>⬇ ${escapeHtml(title)}.pdf</a>
</div>
<div id="frame-wrap">
  <iframe id="iframe" src="${escapeHtml(pdfFileName)}"></iframe>
</div>
<script>
(function(){
  var ifr=document.getElementById('iframe');
  ifr.focus();
  document.addEventListener('keydown',function(e){
    var inp=document.activeElement;
    if(inp&&(inp.tagName==='INPUT'||inp.tagName==='TEXTAREA'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ')e.preventDefault();
    if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp')e.preventDefault();
  },{passive:false});
})();
</script>
</body>
</html>`

  return [
    { path: 'index.html', content: html },
    { path: pdfFileName, content: pdfBuffer },
  ]
}
