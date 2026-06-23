export function renderPlayground(baseDomain: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="在线了解并实时测试 PageFire 的 MCP 工具：选一个 API Key，调用 deploy_markdown、deploy_page 等，立刻看到真实结果。">
<title>Playground — PageFire MCP 在线测试</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0b;--bg2:#0f0f11;--sur:rgba(255,255,255,.025);--sur2:rgba(255,255,255,.045);
  --bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.14);
  --txt:#fafafa;--muted:#a1a1aa;--dim:#71717a;
  --fire:#f97316;--fire2:#fb923c;--fire-dim:rgba(249,115,22,.12);--green:#4ade80;--red:#f87171
}
html{-webkit-font-smoothing:antialiased}
body{background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;min-height:100vh;line-height:1.65;font-size:14px}
a{color:inherit;text-decoration:none}
code,pre{font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace}
.w{max-width:1040px;margin:0 auto;padding:0 24px}

nav{border-bottom:1px solid var(--bdr);background:rgba(10,10,11,.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50}
.nav-i{display:flex;align-items:center;justify-content:space-between;height:58px}
.logo{display:flex;align-items:center;gap:9px;font-weight:650;font-size:15.5px}
.flame{width:26px;height:26px;border-radius:7px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:13px}
.nav-r{display:flex;gap:6px;align-items:center}
.nav-r a{color:var(--muted);font-size:13.5px;padding:7px 12px;border-radius:8px;transition:.15s}
.nav-r a:hover{color:var(--txt);background:var(--sur)}

.hd{padding:54px 0 18px;text-align:center}
.tag{display:inline-flex;align-items:center;gap:8px;padding:5px 13px;border-radius:100px;background:var(--sur);border:1px solid var(--bdr);font-size:12.5px;color:var(--muted);margin-bottom:18px}
.ping{width:7px;height:7px;border-radius:50%;background:var(--fire);box-shadow:0 0 9px var(--fire)}
h1{font-size:clamp(28px,5vw,42px);font-weight:720;letter-spacing:-1.4px;margin-bottom:14px}
.sub{color:var(--muted);font-size:15px;max-width:540px;margin:0 auto;line-height:1.7}

/* tool cards */
.sec{padding:40px 0}
.stag{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:var(--fire);font-weight:700;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:var(--bdr);border-radius:13px;overflow:hidden}
.card{background:var(--bg2);padding:20px 22px}
.card h3{font-size:13.5px;font-weight:650;margin-bottom:6px}
.card h3 code{color:var(--fire2);font-size:12.5px}
.card p{font-size:12.5px;color:var(--muted);line-height:1.65}

/* tester */
.panel{border:1px solid var(--bdr);border-radius:14px;background:var(--bg2);overflow:hidden;margin-top:18px}
.panel-h{padding:16px 22px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.panel-h h2{font-size:15px;font-weight:660}
.panel-b{padding:22px}
.row{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.fld{flex:1;min-width:200px}
label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:500}
select,textarea,input{width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 12px;color:var(--txt);font-size:13.5px;outline:none;transition:.15s;font-family:inherit}
select:focus,textarea:focus,input:focus{border-color:rgba(249,115,22,.5);box-shadow:0 0 0 3px var(--fire-dim)}
textarea{font-family:'SF Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.6;resize:vertical;min-height:150px}
.run{background:#fafafa;color:#0a0a0b;font-weight:600;font-size:13.5px;padding:10px 20px;border:none;border-radius:9px;cursor:pointer;transition:.15s}
.run:hover{background:#e4e4e7}
.run:disabled{opacity:.5;cursor:default}
.hint{font-size:11.5px;color:var(--dim);margin-top:6px}
.hint code{color:var(--fire2)}

/* result */
.res{margin-top:18px;border:1px solid var(--bdr);border-radius:11px;overflow:hidden;display:none}
.res.show{display:block}
.res-h{padding:10px 16px;font-size:12.5px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--bdr);background:var(--sur)}
.dot{width:8px;height:8px;border-radius:50%}
.dot.ok{background:var(--green);box-shadow:0 0 8px rgba(74,222,128,.5)}
.dot.err{background:var(--red)}
.res-b{padding:16px;background:#0a0a0b}
.res-url{display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;padding:9px 14px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);border-radius:9px;color:var(--fire2);font-size:13px;font-weight:600}
pre.json{font-size:12px;line-height:1.6;color:#d4d4d8;white-space:pre-wrap;word-break:break-word;max-height:340px;overflow:auto}

/* gate (not logged in) */
.gate{text-align:center;padding:48px 24px;color:var(--muted)}
.gate .g-ico{font-size:30px;margin-bottom:14px;opacity:.6}
.gate p{font-size:14px;margin-bottom:20px}
.btn-primary{display:inline-block;background:#fafafa;color:#0a0a0b;font-weight:600;font-size:13.5px;padding:10px 20px;border-radius:9px}

.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#fafafa;color:#0a0a0b;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;opacity:0;transition:.25s;z-index:200;pointer-events:none}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
footer{border-top:1px solid var(--bdr);padding:22px 0;margin-top:50px}
.fc{font-size:12px;color:var(--dim);text-align:center}
@media(max-width:560px){.hd{padding:36px 0 10px}}
</style>
</head>
<body>
<nav><div class="w nav-i">
  <a class="logo" href="/"><span class="flame">🔥</span>PageFire</a>
  <div class="nav-r">
    <a href="/#features">功能</a>
    <a href="/#quickstart">接入</a>
    <a href="/dashboard">控制台</a>
  </div>
</div></nav>

<div class="w">
  <div class="hd">
    <div class="tag"><span class="ping"></span>MCP Playground · 在线实测</div>
    <h1>了解并测试 MCP 工具</h1>
    <p class="sub">选一个你的 API Key，直接在浏览器里调用 PageFire 的 MCP 工具，立刻看到真实响应与可访问的页面 URL —— 与 AI 客户端走的是同一条链路。</p>
  </div>

  <div class="sec">
    <div class="stag">可用工具</div>
    <div class="grid">
      <div class="card"><h3><code>deploy_markdown</code></h3><p>Markdown 渲染成精致网页，三主题可选。</p></div>
      <div class="card"><h3><code>deploy_page</code></h3><p>发布单页 HTML，秒得独立 HTTPS 子域名。</p></div>
      <div class="card"><h3><code>deploy_docs</code></h3><p>多篇 Markdown 生成带侧栏的文档站。</p></div>
      <div class="card"><h3><code>list_deployments</code></h3><p>列出当前 Key 下的所有部署。</p></div>
    </div>
  </div>

  <div class="sec" style="padding-top:8px">
    <div class="stag">交互测试台</div>
    <div class="panel">
      <div class="panel-h"><h2>调用 MCP 工具</h2><span id="endpoint" style="font-size:12px;color:var(--dim)">mcp.${baseDomain}/mcp</span></div>
      <div class="panel-b" id="tester-body">
        <div class="gate" id="gate">
          <div class="g-ico">🔑</div>
          <p>登录后即可用你自己的 API Key 实时测试</p>
          <a class="btn-primary" href="/#" onclick="location.href='/';return false">去登录 / 注册</a>
        </div>

        <div id="tester" style="display:none">
          <div class="row">
            <div class="fld">
              <label>API Key</label>
              <select id="key-sel"></select>
            </div>
            <div class="fld">
              <label>工具</label>
              <select id="tool-sel">
                <option value="deploy_markdown">deploy_markdown — Markdown 渲染</option>
                <option value="deploy_page">deploy_page — 单页 HTML</option>
                <option value="deploy_docs">deploy_docs — 文档站</option>
                <option value="list_deployments">list_deployments — 列出部署</option>
              </select>
            </div>
          </div>
          <div class="fld">
            <label>参数 (JSON)</label>
            <textarea id="args" spellcheck="false"></textarea>
            <div class="hint">这就是 MCP <code>tools/call</code> 的 <code>arguments</code>。可自由编辑。</div>
          </div>
          <div style="margin-top:16px;display:flex;align-items:center;gap:12px">
            <button class="run" id="run-btn" onclick="run()">▶ 运行</button>
            <span id="ms" style="font-size:12px;color:var(--dim)"></span>
          </div>

          <div class="res" id="res">
            <div class="res-h"><span class="dot" id="res-dot"></span><span id="res-label"></span></div>
            <div class="res-b">
              <a class="res-url" id="res-url" target="_blank" rel="noopener" style="display:none"></a>
              <pre class="json" id="res-json"></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>
<footer><div class="w fc">© 2026 PageFire · MCP Playground</div></footer>

<script>
const $ = id => document.getElementById(id)
const baseDomain = ${JSON.stringify(baseDomain)}

const EXAMPLES = {
  deploy_markdown: { markdown: "# 你好，PageFire\\n\\n这是用 **deploy_markdown** 渲染的页面。\\n\\n- 支持表格、代码块\\n- 三种主题\\n", title: "测试页", theme: "dark" },
  deploy_page: { html: "<h1>Hello PageFire</h1><p>这是 deploy_page 发布的页面。</p>", title: "测试页" },
  deploy_docs: { title: "测试文档", theme: "light", files: [
    { path: "index.md", markdown: "# 首页\\n\\n前往 [指南](./guide.md)。" },
    { path: "guide.md", markdown: "# 指南\\n\\n返回 [首页](./index.md)。" }
  ] },
  list_deployments: {},
}

function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800) }

async function init(){
  let me
  try { const r = await fetch('/api/me',{credentials:'same-origin'}); if(!r.ok) throw 0; me = await r.json() }
  catch { $('gate').style.display=''; $('tester').style.display='none'; return }
  const kr = await fetch('/api/keys',{credentials:'same-origin'})
  const { keys } = await kr.json()
  const active = (keys||[]).filter(k=>k.status==='active')
  if(!active.length){ $('gate').innerHTML='<div class="g-ico">🔑</div><p>你还没有可用的 API Key</p><a class="btn-primary" href="/dashboard">去控制台创建</a>'; return }
  $('gate').style.display='none'; $('tester').style.display=''
  $('key-sel').innerHTML = active.map(k=>'<option value="'+k.id+'">'+esc(k.label||k.space_id)+' ('+k.space_id+')</option>').join('')
  setArgs()
}
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }
function setArgs(){ const t=$('tool-sel').value; $('args').value = JSON.stringify(EXAMPLES[t]||{}, null, 2) }
$('tool-sel').addEventListener('change', setArgs)

async function run(){
  const btn=$('run-btn'); const tool=$('tool-sel').value; const keyId=$('key-sel').value
  let args
  try { args = JSON.parse($('args').value||'{}') }
  catch { toast('参数不是合法 JSON'); return }
  btn.disabled=true; btn.textContent='运行中…'; $('ms').textContent=''
  try {
    const r = await fetch('/api/playground',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ key_id:keyId, tool, arguments:args })})
    const d = await r.json()
    showResult(r.ok && d.ok, d)
    if(d.ms!=null) $('ms').textContent = d.ms+' ms'
  } catch { toast('请求失败') }
  btn.disabled=false; btn.textContent='▶ 运行'
}

function showResult(ok, d){
  const res=$('res'); res.classList.add('show')
  $('res-dot').className = 'dot ' + (ok?'ok':'err')
  $('res-label').textContent = ok ? '调用成功' : ('失败' + (d.error?'：'+d.error:''))
  const payload = d.result !== undefined ? d.result : d
  const url = payload && payload.url
  const u = $('res-url')
  if(ok && url){ u.style.display='inline-flex'; u.href=url; u.textContent='打开页面 → '+url.replace('https://','') }
  else u.style.display='none'
  $('res-json').textContent = JSON.stringify(payload, null, 2)
}
init()
</script>
</body>
</html>`
}
