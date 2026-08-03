/**
 * Branded password gate for password-protected deployments.
 *
 * Self-contained page: inline styles only (no external assets), so it loads
 * even though the protected subdomain rejects unauthenticated asset requests.
 * The form posts back to `_pf/login` on the same origin (same-origin form POST
 * is permitted by the default CSP). `next` carries the originally requested
 * path so the visitor lands back where they started after authenticating.
 */

/**
 * Keep only safe relative paths for the post-login redirect target.
 * Rejects `//...` (protocol-relative open redirect) and anything that isn't a
 * plain same-origin path.
 */
export function sanitizeNextPath(raw: string | null | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.includes('..') || raw.includes('\0') || raw.includes('\r') || raw.includes('\n')) return '/'
  if (!/^[a-zA-Z0-9_\-./%]+$/.test(raw)) return '/'
  return raw
}

/**
 * Extract the auto-login password from a URL fragment like `#pf=<password>`.
 * Fragments are never sent to the server, so the password stays out of
 * nginx access logs and query strings. The login page auto-submits it.
 */
export function parseFragmentPassword(hash: string): string | null {
  if (!hash) return null
  const i = hash.indexOf('pf=')
  if (i === -1) return null
  const raw = hash.slice(i + 3)
  if (!raw) return null
  try { return decodeURIComponent(raw) } catch { return null }
}

export function renderLoginPage(opts: { error?: boolean; next?: string } = {}): string {
  const next = sanitizeNextPath(opts.next)
  const errorMsg = opts.error
    ? '<p class="err">密码错误，请重试</p>'
    : '<p class="hint">请输入访问密码后继续浏览</p>'
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>访问密码 — PageFire</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a0b;--bg2:#0f0f11;--bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.14);--txt:#fafafa;--muted:#a1a1aa;--fire:#f97316;--fire2:#fb923c}
html{-webkit-font-smoothing:antialiased}
body{background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px;line-height:1.6}
.card{width:100%;max-width:380px;background:var(--bg2);border:1px solid var(--bdr);border-radius:14px;padding:34px 28px;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.brand .flame{font-size:26px}
.brand .name{font-size:18px;font-weight:700;letter-spacing:.02em}
.card h1{font-size:15px;font-weight:600;margin:10px 0 4px}
.err{color:#f87171;font-size:13px;margin:2px 0 12px}
.hint{color:var(--muted);font-size:13px;margin:2px 0 14px}
form{display:flex;flex-direction:column;gap:12px;margin-top:6px}
input[type=password]{background:#161618;border:1px solid var(--bdr);border-radius:9px;color:var(--txt);font-size:15px;padding:12px 14px;outline:none;transition:.15s}
input[type=password]:focus{border-color:var(--fire);box-shadow:0 0 0 3px rgba(249,115,22,.12)}
button{background:linear-gradient(135deg,var(--fire),var(--fire2));border:0;border-radius:9px;color:#fff;font-size:15px;font-weight:600;padding:12px 14px;cursor:pointer;transition:.15s}
button:hover{filter:brightness(1.08)}
button:active{transform:translateY(1px)}
.foot{margin-top:20px;font-size:12px;color:#71717a;text-align:center}
.foot a{color:var(--fire);text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="brand"><span class="flame">🔥</span><span class="name">PageFire</span></div>
  <h1>此页面受密码保护</h1>
  ${errorMsg}
  <form action="/_pf/login" method="post">
    <input type="hidden" name="next" value="${next}">
    <input type="password" name="password" placeholder="请输入访问密码" autofocus autocomplete="current-password">
    <button type="submit">进入</button>
  </form>
  <p class="foot">Powered by <a href="/" rel="noopener">PageFire</a></p>
</div>
<script>
(function(){
  // Auto-login from a share link fragment:  .../#pf=<password>
  var h = location.hash || '';
  var i = h.indexOf('pf=');
  if (i === -1) return;
  var pw = '';
  try { pw = decodeURIComponent(h.slice(i + 3)); } catch (e) {}
  if (!pw) return;
  var input = document.querySelector('input[name="password"]');
  if (!input) return;
  input.value = pw;
  var form = document.querySelector('form');
  if (form) form.submit();
})();
</script>
</body>
</html>`
}
