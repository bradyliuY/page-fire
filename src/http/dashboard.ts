export function renderDashboard(baseDomain: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>控制台 — PageFire</title>
<link rel="icon" type="image/png" href="/favicon.ico">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0b;--bg2:#0f0f11;--sur:rgba(255,255,255,.025);--sur2:rgba(255,255,255,.04);
  --bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.13);
  --txt:#fafafa;--muted:#a1a1aa;--dim:#71717a;
  --fire:#f97316;--fire2:#fb923c;--fire-dim:rgba(249,115,22,.12);
  --red:#f87171;--green:#4ade80
}
html{-webkit-font-smoothing:antialiased}
body{background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;line-height:1.6;font-size:14px}
a{color:inherit;text-decoration:none}
code{font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace}

nav{border-bottom:1px solid var(--bdr);background:rgba(10,10,11,.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50}
.nav-i{max-width:1080px;margin:0 auto;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:9px;font-weight:650;font-size:15.5px;letter-spacing:-.2px}
.flame{width:26px;height:26px;border-radius:7px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:13px}
.nav-r{display:flex;align-items:center;gap:14px}
.uname{font-size:13px;color:var(--muted)}
.btn-ghost{font-size:13px;color:var(--muted);padding:6px 12px;border-radius:8px;border:1px solid var(--bdr);cursor:pointer;background:none;transition:.15s}
.btn-ghost:hover{color:var(--txt);border-color:var(--bdr2);background:var(--sur)}

/* sidebar layout */
.layout{max-width:1080px;margin:0 auto;padding:36px 24px 80px;display:flex;gap:34px}
.side{width:180px;flex-shrink:0;display:flex;flex-direction:column;gap:3px;position:sticky;top:92px;align-self:flex-start}
.snav{text-align:left;background:none;border:none;color:var(--muted);font-size:13.5px;font-family:inherit;padding:9px 13px;border-radius:9px;cursor:pointer;transition:.15s;display:flex;align-items:center;gap:9px}
.snav:hover{color:var(--txt);background:var(--sur)}
.snav.active{color:var(--fire2);background:var(--fire-dim);font-weight:600}
.snav .si{font-size:14px;width:18px;text-align:center}
.snav-link{margin-top:10px;padding:9px 13px;font-size:13px;color:var(--dim);display:flex;align-items:center;gap:9px}
.snav-link:hover{color:var(--fire2)}
.content{flex:1;min-width:0}
.pane{display:none}
.pane.active{display:block}

.head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:8px;flex-wrap:wrap}
h1{font-size:23px;font-weight:680;letter-spacing:-.5px}
.sub{color:var(--dim);font-size:13.5px;margin-bottom:26px}
.btn-primary{background:#fafafa;color:#0a0a0b;font-weight:600;font-size:13.5px;padding:9px 16px;border-radius:9px;border:none;cursor:pointer;transition:.15s;white-space:nowrap}
.btn-primary:hover{background:#e4e4e7;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:default;transform:none}

/* overview */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:26px}
.stat{border:1px solid var(--bdr);border-radius:14px;background:var(--bg2);padding:20px 22px}
.stat-v{font-size:27px;font-weight:680;letter-spacing:-1px;font-variant-numeric:tabular-nums}
.stat-l{font-size:12.5px;color:var(--dim);margin-top:3px}
.card{border:1px solid var(--bdr);border-radius:14px;background:var(--bg2);padding:20px 22px;font-size:13px;color:var(--muted);line-height:1.8}
.card h3{font-size:14px;color:var(--txt);font-weight:620;margin-bottom:8px}
.card code{background:#0a0a0b;border:1px solid var(--bdr);border-radius:6px;padding:2px 7px;color:var(--fire2);font-size:12px}

/* key list */
.keys{border:1px solid var(--bdr);border-radius:14px;overflow:hidden;background:var(--bg2)}
.krow{display:flex;align-items:center;gap:16px;padding:18px 22px;border-bottom:1px solid var(--bdr);transition:.15s}
.krow:last-child{border-bottom:none}
.krow:hover{background:var(--sur)}
.kmain{flex:1;min-width:0}
.klabel{font-weight:600;font-size:14px;display:flex;align-items:center;gap:9px;margin-bottom:3px}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.dot.on{background:var(--green);box-shadow:0 0 8px rgba(74,222,128,.6)}
.dot.off{background:var(--dim)}
.kurl{font-size:12.5px;color:var(--muted);font-family:'SF Mono',ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.kurl:hover{color:var(--fire2)}
.kmeta{display:flex;gap:18px;align-items:center;flex-shrink:0}
.kmcol{text-align:right}
.kmv{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.kml{font-size:11px;color:var(--dim);margin-top:1px}
.ktoken{font-size:12px;color:var(--dim);font-family:'SF Mono',ui-monospace,monospace}
.kact{display:flex;gap:6px}
.icon-btn{width:30px;height:30px;border-radius:8px;border:1px solid var(--bdr);background:none;color:var(--muted);cursor:pointer;display:grid;place-items:center;font-size:13px;transition:.15s}
.icon-btn:hover{border-color:var(--bdr2);color:var(--txt);background:var(--sur)}
.icon-btn.danger:hover{border-color:rgba(248,113,113,.4);color:var(--red);background:rgba(248,113,113,.08)}
.badge-rev{font-size:11px;color:var(--dim);border:1px solid var(--bdr);padding:2px 8px;border-radius:6px}

/* empty */
.empty{text-align:center;padding:60px 24px;color:var(--dim)}
.empty .e-ico{font-size:30px;margin-bottom:14px;opacity:.5}
.empty p{font-size:14px;margin-bottom:22px}

/* deployments grouped by key */
.group{border:1px solid var(--bdr);border-radius:14px;overflow:hidden;background:var(--bg2);margin-bottom:16px}
.ghead{display:flex;align-items:center;gap:10px;padding:12px 20px;background:var(--sur);border-bottom:1px solid var(--bdr);font-size:13px}
.gname{font-weight:600}
.gspace{font-family:'SF Mono',ui-monospace,monospace;color:var(--dim);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gcount{margin-left:auto;color:var(--dim);font-size:12px;white-space:nowrap}
.drow{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--bdr);transition:.15s}
.drow:last-child{border-bottom:none}
.drow:hover{background:var(--sur)}
.dmain{flex:1;min-width:0}
.dtitle{font-weight:550;font-size:13.5px;margin-bottom:2px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.durl{font-size:12px;color:var(--muted);font-family:'SF Mono',ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:100%}
.durl:hover{color:var(--fire2)}
.dmeta{display:flex;gap:16px;align-items:center;flex-shrink:0;text-align:right}
.dmv{font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--muted)}
.dml{font-size:10.5px;color:var(--dim);margin-top:1px}
.bdg{font-size:10.5px;padding:1px 7px;border-radius:5px;border:1px solid var(--bdr);color:var(--dim);font-weight:500;white-space:nowrap}
.bdg.lock{color:var(--fire2);border-color:rgba(249,115,22,.3);background:var(--fire-dim)}
.bdg.pin{color:var(--green);border-color:rgba(74,222,128,.3)}
.dact{display:flex;gap:6px;flex-shrink:0}

/* modal */
.ov{display:none;position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:16px}
.ov.show{display:flex}
.modal{background:#121214;border:1px solid var(--bdr2);border-radius:16px;padding:28px;width:100%;max-width:430px;position:relative}
.modal h2{font-size:17px;font-weight:660;margin-bottom:4px;letter-spacing:-.2px}
.modal .mdesc{font-size:13px;color:var(--dim);margin-bottom:22px}
.x{position:absolute;top:16px;right:18px;background:none;border:none;color:var(--dim);font-size:22px;cursor:pointer;line-height:1}
.x:hover{color:var(--txt)}
label{font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px;font-weight:500}
.field{margin-bottom:16px}
input{width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s;font-family:inherit}
input:focus{border-color:rgba(249,115,22,.5);box-shadow:0 0 0 3px var(--fire-dim)}
.hint{font-size:11.5px;color:var(--dim);margin-top:5px}
.err{display:none;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);border-radius:8px;padding:9px 12px;font-size:13px;color:#fca5a5;margin-bottom:14px}
.modal .btn-primary{width:100%;padding:11px}
.reveal{text-align:center}
.reveal .r-ico{width:46px;height:46px;border-radius:12px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:22px;margin:0 auto 16px}
.reveal h2{margin-bottom:4px}
.tokbox{position:relative;margin:18px 0 8px}
.tokbox code{display:block;background:#0a0a0b;border:1px solid var(--bdr);border-radius:10px;padding:13px 46px 13px 14px;font-size:12px;color:var(--fire2);word-break:break-all;text-align:left;line-height:1.6}
.copy{position:absolute;right:9px;top:9px;background:var(--sur2);border:1px solid var(--bdr);border-radius:7px;padding:5px 9px;color:var(--muted);cursor:pointer;font-size:12px;transition:.15s}
.copy:hover{color:var(--txt);border-color:var(--bdr2)}
.warn-once{font-size:12px;color:var(--fire2);background:var(--fire-dim);border-radius:8px;padding:8px 12px;margin-bottom:18px}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#fafafa;color:#0a0a0b;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;opacity:0;transition:.25s;z-index:200;pointer-events:none}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(max-width:720px){.layout{flex-direction:column;gap:18px;padding:24px 16px 60px}.side{width:auto;flex-direction:row;position:static;overflow-x:auto;gap:4px}.snav-link{display:none}.stats{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.kmeta,.dmeta{display:none}}
</style>
</head>
<body>
<nav><div class="nav-i">
  <a class="logo" href="/"><img src="/logo.png" alt="PageFire" style="height:34px;width:auto;display:block"></a>
  <div class="nav-r">
    <a class="btn-ghost" href="/playground" style="text-decoration:none">Playground</a>
    <span class="uname" id="uname"></span>
    <button class="btn-ghost" onclick="logout()">退出</button>
  </div>
</div></nav>

<div class="layout">
  <aside class="side">
    <button class="snav active" data-pane="overview" onclick="switchPane('overview')"><span class="si">▦</span>概览</button>
    <button class="snav" data-pane="keys" onclick="switchPane('keys')"><span class="si">🔑</span>API Keys</button>
    <button class="snav" data-pane="deploy" onclick="switchPane('deploy')"><span class="si">📦</span>部署应用</button>
    <button class="snav" data-pane="account" onclick="switchPane('account')"><span class="si">⚙</span>账户</button>
    <a class="snav-link" href="/playground"><span class="si">⚡</span>Playground ↗</a>
  </aside>

  <main class="content">
    <!-- 概览 -->
    <section class="pane active" id="pane-overview">
      <div class="head"><div>
        <h1>概览</h1>
        <div class="sub">你好，<span id="ov-user">—</span>。这里是你的发布概况。</div>
      </div></div>
      <div class="stats">
        <div class="stat"><div class="stat-v" id="ov-keys">—</div><div class="stat-l">API Keys</div></div>
        <div class="stat"><div class="stat-v" id="ov-deps">—</div><div class="stat-l">已发布站点</div></div>
        <div class="stat"><div class="stat-v" id="ov-size">—</div><div class="stat-l">存储用量</div></div>
      </div>
      <div class="card">
        <h3>怎么发布</h3>
        在 Claude / Cursor 等 MCP 客户端配置 <code>npx pagefire-mcp@latest</code>（用上方 API Key 作 <code>PAGEFIRE_TOKEN</code>），一句话即可发布网页；用 <code>deploy_dir</code> 可直接发布整个本地目录。详见 <a href="/playground#connect" style="color:var(--fire2)">Playground → 接入</a>。
      </div>
    </section>

    <!-- API Keys -->
    <section class="pane" id="pane-keys">
      <div class="head">
        <div>
          <h1>API Keys</h1>
          <div class="sub">每个 Key 拥有独立子域名空间，AI 通过它发布站点。密钥仅在创建时显示一次。</div>
        </div>
        <button class="btn-primary" onclick="openCreate()">+ 新建 API Key</button>
      </div>
      <div id="list"></div>
    </section>

    <!-- 部署应用 -->
    <section class="pane" id="pane-deploy">
      <div class="head"><div>
        <h1>部署应用</h1>
        <div class="sub">所有已发布的站点，按所属 API Key 分组，可直接管理。</div>
      </div></div>
      <div id="deploy-list"></div>
    </section>

    <!-- 账户 -->
    <section class="pane" id="pane-account">
      <div class="head"><div>
        <h1>账户</h1>
        <div class="sub">基本信息与安全设置。</div>
      </div></div>
      <div class="card" style="margin-bottom:16px">
        <h3>基本信息</h3>
        <div style="display:flex;gap:48px;flex-wrap:wrap;margin-top:8px">
          <div><div style="font-size:11.5px;color:var(--dim)">用户名</div><div id="ac-user" style="font-size:14.5px;color:var(--txt);margin-top:3px">—</div></div>
          <div><div style="font-size:11.5px;color:var(--dim)">注册时间</div><div id="ac-since" style="font-size:14.5px;color:var(--txt);margin-top:3px">—</div></div>
        </div>
      </div>
      <div class="card">
        <h3>修改密码</h3>
        <div class="err" id="pw-err" style="margin-top:12px"></div>
        <div class="field" style="max-width:340px"><label>当前密码</label><input id="pw-cur" type="password" placeholder="当前密码"></div>
        <div class="field" style="max-width:340px"><label>新密码</label><input id="pw-new" type="password" placeholder="至少 6 位"></div>
        <div class="field" style="max-width:340px"><label>确认新密码</label><input id="pw-cf" type="password" placeholder="再次输入新密码"></div>
        <button class="btn-primary" id="pw-btn" onclick="changePassword()">更新密码</button>
      </div>
    </section>
  </main>
</div>

<!-- create modal -->
<div class="ov" id="ov-create">
  <div class="modal">
    <button class="x" onclick="closeModal('ov-create')">×</button>
    <h2>新建 API Key</h2>
    <div class="mdesc">创建一个独立的发布空间。</div>
    <div class="err" id="c-err"></div>
    <div class="field">
      <label>名称 <span style="color:var(--dim)">(可选)</span></label>
      <input id="c-label" placeholder="例如：产品落地页" maxlength="40">
    </div>
    <div class="field">
      <label>自定义 space_id <span style="color:var(--dim)">(可选，留空随机生成)</span></label>
      <input id="c-space" placeholder="4–20 位，a-z 0-9 -" maxlength="20">
      <div class="hint">将作为子域名：<code id="c-preview">&lt;space_id&gt;.${baseDomain}</code></div>
    </div>
    <button class="btn-primary" id="c-btn" onclick="createKey()">创建</button>
  </div>
</div>

<!-- reveal modal -->
<div class="ov" id="ov-reveal">
  <div class="modal reveal">
    <div class="r-ico">🔑</div>
    <h2>API Key 已创建</h2>
    <div class="mdesc" id="r-space"></div>
    <div class="warn-once">⚠ 请立即复制保存，关闭后将无法再次查看完整密钥。</div>
    <div class="tokbox">
      <code id="r-token"></code>
      <button class="copy" onclick="copyTok()">复制</button>
    </div>
    <button class="btn-primary" style="margin-top:14px" onclick="closeReveal()">完成</button>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const $ = id => document.getElementById(id)
const baseDomain = ${JSON.stringify(baseDomain)}
const state = { keys: [], groups: [] }

async function api(path, opts) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts })
  if (r.status === 401) { location.href = '/'; throw new Error('unauth') }
  return r
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600) }
function fmtDate(ts) { const d = new Date(ts); return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0') }
function fmtSize(b){ if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB' }
function fmtDateTime(ts){ const d=new Date(ts); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'/'+p(d.getMonth()+1)+'/'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()) }
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }

function switchPane(name) {
  document.querySelectorAll('.snav').forEach(b => b.classList.toggle('active', b.dataset.pane === name))
  document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name))
}

async function init() {
  try {
    const me = await (await api('/api/me')).json()
    $('uname').textContent = me.username
    $('ov-user').textContent = me.username
    $('ac-user').textContent = me.username
    $('ac-since').textContent = me.created_at ? fmtDate(me.created_at) : '—'
  } catch { return }
  loadKeys()
  loadDeployments()
}

function renderOverview() {
  const activeKeys = state.keys.filter(k => k.status === 'active').length
  let deps = 0, size = 0
  for (const g of state.groups) for (const d of g.deployments) { deps++; size += d.size_bytes }
  $('ov-keys').textContent = activeKeys
  $('ov-deps').textContent = deps
  $('ov-size').textContent = fmtSize(size)
}

async function loadKeys() {
  const { keys } = await (await api('/api/keys')).json()
  state.keys = keys
  renderOverview()
  const list = $('list')
  if (!keys.length) {
    list.innerHTML = '<div class="keys"><div class="empty"><div class="e-ico">🔑</div><p>还没有 API Key</p><button class="btn-primary" onclick="openCreate()">+ 创建第一个 Key</button></div></div>'
    return
  }
  const rows = keys.map(k => {
    const on = k.status === 'active'
    const actions = !on ? '<span class="badge-rev">已吊销</span>'
      : '<button class="icon-btn" title="测试连接" onclick="testKey(\\'' + k.id + '\\',this)">⚡</button>' +
        '<button class="icon-btn danger" title="吊销" data-id="' + k.id + '" data-label="' + esc(k.label || k.space_id) + '" onclick="revoke(this)">✕</button>'
    return '<div class="krow">' +
      '<div class="kmain">' +
        '<div class="klabel"><span class="dot ' + (on?'on':'off') + '"></span>' + esc(k.label || k.space_id) + '</div>' +
        (on ? '<a class="kurl" href="' + k.base_url + '" target="_blank" rel="noopener">' + k.base_url.replace('https://','') + '</a>'
            : '<span class="kurl">' + k.token_masked + '</span>') +
      '</div>' +
      '<div class="kmeta">' +
        '<div class="kmcol"><div class="kmv">' + k.deployment_count + '</div><div class="kml">部署</div></div>' +
        '<div class="kmcol"><div class="ktoken">' + k.token_masked + '</div><div class="kml">' + fmtDate(k.created_at) + '</div></div>' +
      '</div>' +
      '<div class="kact">' + actions + '</div>' +
    '</div>'
  }).join('')
  list.innerHTML = '<div class="keys">' + rows + '</div>'
}

async function loadDeployments() {
  let data
  try { data = await (await api('/api/deployments')).json() } catch { return }
  state.groups = data.groups || []
  renderOverview()
  const el = $('deploy-list')
  if (!state.groups.length) {
    el.innerHTML = '<div class="group"><div class="empty"><div class="e-ico">📦</div><p>还没有发布任何站点</p></div></div>'
    return
  }
  el.innerHTML = state.groups.map(g => {
    const rows = g.deployments.map(d => {
      const badges =
        (d.access === 'password' ? '<span class="bdg lock">🔒 密码</span>' : '') +
        (d.pinned ? '<span class="bdg pin">📌 永久</span>' : '') +
        (d.spa ? '<span class="bdg">SPA</span>' : '')
      const life = d.pinned ? '永久' : (d.expires_at ? '到 ' + fmtDate(d.expires_at) : '—')
      return '<div class="drow">' +
        '<div class="dmain">' +
          '<div class="dtitle">' + esc(d.title || d.did) + ' ' + badges + '</div>' +
          '<a class="durl" href="' + d.url + '" target="_blank" rel="noopener">' + esc(d.url.replace('https://','').replace(/\\/$/,'')) + '</a>' +
        '</div>' +
        '<div class="dmeta">' +
          '<div><div class="dmv">' + fmtSize(d.size_bytes) + '</div><div class="dml">' + d.file_count + ' 文件</div></div>' +
          '<div><div class="dmv">' + fmtDateTime(d.created_at) + '</div><div class="dml">' + life + '</div></div>' +
        '</div>' +
        '<div class="dact">' +
          '<button class="icon-btn" title="复制链接" data-url="' + d.url + '" onclick="copyUrl(this)">⧉</button>' +
          '<button class="icon-btn" title="' + (d.pinned ? '取消永久' : '设为永久') + '" data-did="' + d.did + '" data-pin="' + (d.pinned ? '0' : '1') + '" onclick="togglePin(this)">📌</button>' +
          '<button class="icon-btn danger" title="删除" data-did="' + d.did + '" data-name="' + esc(d.title || d.did) + '" onclick="delDeploy(this)">✕</button>' +
        '</div>' +
      '</div>'
    }).join('')
    return '<div class="group">' +
      '<div class="ghead">' +
        '<span class="gname">' + esc(g.label || g.space_id) + '</span>' +
        '<span class="gspace">' + esc(g.space_id) + '.' + baseDomain + '</span>' +
        '<span class="gcount">' + g.deployments.length + ' 个部署</span>' +
      '</div>' + rows +
    '</div>'
  }).join('')
}

function copyUrl(btn){ navigator.clipboard.writeText(btn.dataset.url).then(()=>toast('链接已复制')) }
async function togglePin(btn){
  const did = btn.dataset.did, pin = btn.dataset.pin === '1'
  btn.disabled = true
  const r = await api('/api/deployments/' + encodeURIComponent(did) + '/pin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pinned: pin }) })
  if (r.ok) { toast(pin ? '已设为永久' : '已取消永久'); loadKeys(); loadDeployments() }
  else { toast('操作失败'); btn.disabled = false }
}
async function delDeploy(btn){
  const did = btn.dataset.did, name = btn.dataset.name
  if (!confirm('确定删除「' + name + '」？\\n该站点及其文件将被永久删除，不可恢复。')) return
  const r = await api('/api/deployments/' + encodeURIComponent(did), { method:'DELETE' })
  if (r.ok) { toast('已删除'); loadKeys(); loadDeployments() }
}

function openCreate() {
  $('c-err').style.display = 'none'
  $('c-label').value = ''; $('c-space').value = ''
  $('c-preview').textContent = '<space_id>.' + baseDomain
  $('ov-create').classList.add('show')
  setTimeout(() => $('c-label').focus(), 50)
}
$('c-space').addEventListener('input', e => {
  const v = e.target.value.trim()
  $('c-preview').textContent = (v || '<space_id>') + '.' + baseDomain
})
function closeModal(id) { $(id).classList.remove('show') }

async function createKey() {
  const btn = $('c-btn'); const err = $('c-err')
  err.style.display = 'none'; btn.disabled = true; btn.textContent = '创建中…'
  const body = { label: $('c-label').value.trim(), space_id: $('c-space').value.trim() }
  try {
    const r = await api('/api/keys', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) { err.textContent = d.error || '创建失败'; err.style.display = '' }
    else {
      closeModal('ov-create')
      $('r-token').textContent = d.token
      $('r-space').textContent = d.space_id + '.' + baseDomain
      $('ov-reveal').classList.add('show')
    }
  } catch { err.textContent = '网络错误'; err.style.display = '' }
  btn.disabled = false; btn.textContent = '创建'
}
function closeReveal() { closeModal('ov-reveal'); loadKeys() }
function copyTok() { navigator.clipboard.writeText($('r-token').textContent).then(() => toast('已复制到剪贴板')) }

async function revoke(btn) {
  const id = btn.dataset.id, name = btn.dataset.label
  if (!confirm('确定吊销「' + name + '」？\\n该 Key 立即失效，其下所有已发布站点将无法访问。')) return
  const r = await api('/api/keys/' + id, { method:'DELETE' })
  if (r.ok) { toast('已吊销'); loadKeys(); loadDeployments() }
}
async function testKey(id, btn) {
  const prev = btn.textContent; btn.textContent = '⏳'; btn.disabled = true
  try {
    const r = await api('/api/keys/' + id + '/test', { method:'POST' })
    const d = await r.json()
    if (r.ok && d.ok) toast('✓ MCP 连接正常 · ' + d.deployment_count + ' 个部署')
    else toast('✗ ' + (d.error || '连接失败'))
  } catch { toast('✗ 测试失败') }
  btn.textContent = prev; btn.disabled = false
}
async function changePassword() {
  const err = $('pw-err'); err.style.display = 'none'
  const cur = $('pw-cur').value, nw = $('pw-new').value, cf = $('pw-cf').value
  if (nw.length < 6) { err.textContent = '新密码至少 6 位'; err.style.display = ''; return }
  if (nw !== cf) { err.textContent = '两次输入的新密码不一致'; err.style.display = ''; return }
  const btn = $('pw-btn'); btn.disabled = true; btn.textContent = '更新中…'
  try {
    const r = await api('/api/account/password', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ current: cur, new: nw }) })
    const d = await r.json()
    if (r.ok) { toast('密码已更新'); $('pw-cur').value = ''; $('pw-new').value = ''; $('pw-cf').value = '' }
    else { err.textContent = d.error || '更新失败'; err.style.display = '' }
  } catch { err.textContent = '网络错误'; err.style.display = '' }
  btn.disabled = false; btn.textContent = '更新密码'
}
async function logout() { await api('/api/logout', { method:'POST' }); location.href = '/' }

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal('ov-create'); closeModal('ov-reveal') } })
init()
</script>
</body>
</html>`
}
