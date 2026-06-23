export function renderPlayground(baseDomain: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="了解、接入并在线测试 PageFire 的 MCP 工具：查看工具列表与接入配置，选一个 API Key 直接调用，立刻看到真实结果。">
<title>Playground — PageFire MCP</title>
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
.w{max-width:1000px;margin:0 auto;padding:0 24px}

nav{border-bottom:1px solid var(--bdr);background:rgba(10,10,11,.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50}
.nav-i{display:flex;align-items:center;justify-content:space-between;height:58px}
.logo{display:flex;align-items:center;gap:9px;font-weight:650;font-size:15.5px}
.flame{width:26px;height:26px;border-radius:7px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:13px}
.nav-r{display:flex;gap:6px;align-items:center}
.nav-r a{color:var(--muted);font-size:13.5px;padding:7px 12px;border-radius:8px;transition:.15s}
.nav-r a:hover{color:var(--txt);background:var(--sur)}

.hd{padding:48px 0 22px;text-align:center}
.tag{display:inline-flex;align-items:center;gap:8px;padding:5px 13px;border-radius:100px;background:var(--sur);border:1px solid var(--bdr);font-size:12.5px;color:var(--muted);margin-bottom:16px}
.ping{width:7px;height:7px;border-radius:50%;background:var(--fire);box-shadow:0 0 9px var(--fire)}
h1{font-size:clamp(26px,4.5vw,38px);font-weight:720;letter-spacing:-1.2px;margin-bottom:12px}
.sub{color:var(--muted);font-size:14.5px;max-width:520px;margin:0 auto;line-height:1.7}

/* tabs */
.tabs{display:flex;gap:2px;justify-content:center;border-bottom:1px solid var(--bdr);margin:28px 0 0}
.tab{background:none;border:none;color:var(--dim);font-family:inherit;font-size:14px;font-weight:550;padding:12px 20px;cursor:pointer;border-bottom:2px solid transparent;transition:.15s;margin-bottom:-1px}
.tab:hover{color:var(--muted)}
.tab.active{color:var(--fire2);border-bottom-color:var(--fire)}
.pane{display:none;padding:32px 0 60px}
.pane.active{display:block}

/* intro */
.lead{font-size:16px;line-height:1.85;color:var(--txt);max-width:680px}
.lead b{color:var(--fire2);font-weight:600}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bdr);border-radius:13px;overflow:hidden;margin-top:30px}
.step{background:var(--bg2);padding:22px}
.sn{font-size:11px;color:var(--fire);font-weight:700;margin-bottom:10px}
.step h4{font-size:14px;font-weight:650;margin-bottom:6px}
.step p{font-size:12.5px;color:var(--muted);line-height:1.6}

/* tool list */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1px;background:var(--bdr);border-radius:13px;overflow:hidden}
.card{background:var(--bg2);padding:18px 20px}
.card h3{font-size:13.5px;font-weight:650;margin-bottom:5px}
.card h3 code{color:var(--fire2);font-size:13px}
.card p{font-size:12.5px;color:var(--muted);line-height:1.6;margin-bottom:7px}
.params{font-size:11.5px;color:var(--dim)}
.params code{color:var(--muted);background:var(--sur);padding:1px 5px;border-radius:4px}

/* connect / code */
.codeblk{background:#0c0c0e;border:1px solid var(--bdr);border-radius:11px;padding:16px 18px;overflow-x:auto;margin:14px 0}
.codeblk pre{font-size:12.5px;line-height:1.7;color:#d4d4d8;white-space:pre}
.kw{color:var(--fire2)}.str{color:#a3e635}.cm{color:#52525b}
.connect-step{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--bdr)}
.connect-step:last-child{border:none}
.cn{width:26px;height:26px;border-radius:8px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);color:var(--fire2);font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0;margin-top:2px}
.connect-step h4{font-size:14px;font-weight:600;margin-bottom:4px}
.connect-step p{font-size:13px;color:var(--muted)}
.connect-step a{color:var(--fire2)}
.kv{display:flex;gap:10px;font-size:13px;margin:5px 0}
.kv span:first-child{color:var(--dim);min-width:72px}
.kv code{color:var(--fire2)}

/* tester */
.panel{border:1px solid var(--bdr);border-radius:14px;background:var(--bg2);overflow:hidden}
.panel-b{padding:22px}
.row{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.fld{flex:1;min-width:200px}
label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:500}
select,textarea,input[type=text]{width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 12px;color:var(--txt);font-size:13.5px;outline:none;transition:.15s;font-family:inherit}
select:focus,textarea:focus{border-color:rgba(249,115,22,.5);box-shadow:0 0 0 3px var(--fire-dim)}
textarea{font-family:'SF Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.6;resize:vertical;min-height:150px}
.uprow{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.upbtn{display:inline-flex;align-items:center;gap:7px;background:var(--sur2);border:1px solid var(--bdr);border-radius:9px;padding:9px 14px;font-size:13px;color:var(--txt);cursor:pointer;transition:.15s}
.upbtn:hover{border-color:var(--bdr2)}
.upnote{font-size:12px;color:var(--dim)}
.run{background:#fafafa;color:#0a0a0b;font-weight:600;font-size:13.5px;padding:10px 20px;border:none;border-radius:9px;cursor:pointer;transition:.15s}
.run:hover{background:#e4e4e7}
.run:disabled{opacity:.5;cursor:default}
.hint{font-size:11.5px;color:var(--dim);margin-top:6px}
.hint code{color:var(--fire2)}
.res{margin-top:18px;border:1px solid var(--bdr);border-radius:11px;overflow:hidden;display:none}
.res.show{display:block}
.res-h{padding:10px 16px;font-size:12.5px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--bdr);background:var(--sur)}
.dot{width:8px;height:8px;border-radius:50%}
.dot.ok{background:var(--green);box-shadow:0 0 8px rgba(74,222,128,.5)}
.dot.err{background:var(--red)}
.res-b{padding:16px;background:#0a0a0b}
.res-url{display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;padding:9px 14px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);border-radius:9px;color:var(--fire2);font-size:13px;font-weight:600}
pre.json{font-size:12px;line-height:1.6;color:#d4d4d8;white-space:pre-wrap;word-break:break-word;max-height:320px;overflow:auto}
.gate{text-align:center;padding:46px 24px;color:var(--muted)}
.gate .g-ico{font-size:30px;margin-bottom:14px;opacity:.6}
.gate p{font-size:14px;margin-bottom:20px}
.btn-primary{display:inline-block;background:#fafafa;color:#0a0a0b;font-weight:600;font-size:13.5px;padding:10px 20px;border-radius:9px}

.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:#fafafa;color:#0a0a0b;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;opacity:0;transition:.25s;z-index:200;pointer-events:none}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
footer{border-top:1px solid var(--bdr);padding:22px 0;margin-top:40px}
.fc{font-size:12px;color:var(--dim);text-align:center}
@media(max-width:600px){.steps{grid-template-columns:1fr}.tab{padding:11px 13px;font-size:13px}}
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
    <div class="tag"><span class="ping"></span>MCP Playground</div>
    <h1>了解、接入并实测 MCP</h1>
    <p class="sub">从这里读懂 PageFire 的 MCP 工具、拿到接入配置，并直接在浏览器里用你的 API Key 调用——与 AI 客户端走同一条链路。</p>
  </div>

  <div class="tabs">
    <button class="tab active" data-p="intro" onclick="pick('intro')">介绍</button>
    <button class="tab" data-p="tools" onclick="pick('tools')">工具</button>
    <button class="tab" data-p="connect" onclick="pick('connect')">接入</button>
    <button class="tab" data-p="test" onclick="pick('test')">测试</button>
  </div>

  <!-- 介绍 -->
  <div class="pane active" id="pane-intro">
    <p class="lead">MCP（Model Context Protocol）是 AI 客户端与外部工具之间的标准协议。把 PageFire 接入 Claude、Cursor 后，你只需用<b>自然语言</b>描述，AI 就会调用 PageFire 的工具，把 HTML、Markdown、整站打包<b>直接发布成公网 HTTPS 页面</b>——几秒完成，链接可长期固定，全程不碰部署流程。</p>
    <div class="steps">
      <div class="step"><div class="sn">01 · 接入</div><h4>配置一次</h4><p>在「接入」页复制 .mcp.json，填入你的 Bearer Token，加入 AI 客户端。</p></div>
      <div class="step"><div class="sn">02 · 对话</div><h4>说一句话</h4><p>“把这份报告发布成网页” —— AI 自动选用合适的工具完成发布。</p></div>
      <div class="step"><div class="sn">03 · 上线</div><h4>拿到链接</h4><p>立刻获得 HTTPS 子域名，直接分享；想更新就让 AI 用同名重发，链接不变。</p></div>
    </div>
  </div>

  <!-- 工具 -->
  <div class="pane" id="pane-tools">
    <div class="grid">
      <div class="card"><h3><code>deploy_page</code> · 单页 HTML</h3><p>发布一段 HTML，秒得独立子域名。</p><div class="params"><code>html</code> <code>title?</code> <code>did?</code> <code>pin?</code> <code>spa?</code></div></div>
      <div class="card"><h3><code>deploy_markdown</code> · Markdown</h3><p>Markdown 渲染成精致网页，三主题。</p><div class="params"><code>markdown</code> <code>theme?</code> <code>title?</code> <code>did?</code></div></div>
      <div class="card"><h3><code>deploy_docs</code> · 文档站</h3><p>多篇 Markdown 生成带侧栏文档站。</p><div class="params"><code>files[]</code> <code>title?</code> <code>theme?</code> <code>did?</code></div></div>
      <div class="card"><h3><code>deploy_zip</code> · 整站打包</h3><p>上传 ZIP 自动解压发布，支持 SPA。</p><div class="params"><code>zip_base64</code> <code>did?</code> <code>spa?</code></div></div>
      <div class="card"><h3><code>deploy_files</code> · 多文件</h3><p>逐文件发布，支持子目录结构。</p><div class="params"><code>files[]</code> <code>did?</code> <code>spa?</code></div></div>
      <div class="card"><h3><code>list_deployments</code> · 列出</h3><p>列出当前 Key 下的所有部署。</p><div class="params"><code>include_expired?</code></div></div>
      <div class="card"><h3><code>get_deployment</code> · 详情</h3><p>查某个部署的详情与 URL。</p><div class="params"><code>did</code></div></div>
      <div class="card"><h3><code>set_access</code> · 访问控制</h3><p>切换公开 / 密码访问。</p><div class="params"><code>did</code> <code>access</code> <code>password?</code></div></div>
      <div class="card"><h3><code>pin_deployment</code> · 永久保留</h3><p>把临时部署置为永不过期。</p><div class="params"><code>did</code></div></div>
      <div class="card"><h3><code>delete_deployment</code> · 删除</h3><p>立即删除某个部署及其文件。</p><div class="params"><code>did</code></div></div>
      <div class="card"><h3><code>set_space_id</code> · 子域名</h3><p>自定义 Key 的 space_id 段。</p><div class="params"><code>space_id</code></div></div>
    </div>
  </div>

  <!-- 接入 -->
  <div class="pane" id="pane-connect">
    <div class="connect-step"><div class="cn">1</div><div><h4>获取 Token</h4><p>在 <a href="/dashboard">控制台</a> 注册并创建一个 API Key（<code style="color:var(--fire2)">pf_</code> 开头）。</p></div></div>
    <div class="connect-step"><div class="cn">2</div><div style="flex:1;min-width:0"><h4>配置 .mcp.json</h4><p>在项目根目录创建（加入 .gitignore，不要提交）：</p>
      <div class="codeblk"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"type"</span>: <span class="str">"http"</span>,
      <span class="str">"url"</span>: <span class="str">"https://mcp.${baseDomain}/mcp"</span>,
      <span class="str">"headers"</span>: { <span class="str">"Authorization"</span>: <span class="str">"Bearer &lt;你的token&gt;"</span> }
    }
  }
}</pre></div>
    </div></div>
    <div class="connect-step"><div class="cn">3</div><div><h4>重载并对话</h4><p>在 Claude Desktop / Cursor 重新加载 MCP，然后直接说：“帮我把这份内容发布成网页”。</p></div></div>
    <div style="margin-top:18px;padding:16px 18px;border:1px solid var(--bdr);border-radius:11px;background:var(--bg2)">
      <div class="kv"><span>端点</span><code>https://mcp.${baseDomain}/mcp</code></div>
      <div class="kv"><span>传输</span><code>Streamable HTTP</code></div>
      <div class="kv"><span>鉴权</span><code>Authorization: Bearer pf_xxx</code></div>
      <div class="kv"><span>客户端</span><span style="color:var(--muted)">Claude Desktop · Cursor · 任何支持 MCP HTTP 的客户端</span></div>
    </div>
  </div>

  <!-- 测试 -->
  <div class="pane" id="pane-test">
    <div class="panel">
      <div class="panel-b" id="tester-body">
        <div class="gate" id="gate">
          <div class="g-ico">🔑</div>
          <p>登录后即可用你自己的 API Key 实时测试</p>
          <a class="btn-primary" href="/">去登录 / 注册</a>
        </div>
        <div id="tester" style="display:none">
          <div class="row">
            <div class="fld"><label>API Key</label><select id="key-sel"></select></div>
            <div class="fld"><label>工具</label>
              <select id="tool-sel">
                <option value="deploy_markdown">deploy_markdown — Markdown 渲染</option>
                <option value="deploy_page">deploy_page — 单页 HTML</option>
                <option value="deploy_docs">deploy_docs — 文档站</option>
                <option value="deploy_zip">deploy_zip — 整站打包</option>
                <option value="list_deployments">list_deployments — 列出部署</option>
              </select>
            </div>
          </div>
          <div class="uprow" id="uprow">
            <label class="upbtn">📎 <span id="up-label">上传文件</span><input type="file" id="file-in" style="display:none" onchange="onFile(this)"></label>
            <span class="upnote" id="up-note">可选：上传文件自动填入参数</span>
          </div>
          <div class="fld"><label>参数 (JSON)</label><textarea id="args" spellcheck="false"></textarea>
            <div class="hint">这就是 MCP <code>tools/call</code> 的 <code>arguments</code>，可自由编辑。</div>
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

function pick(p){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.p===p))
  document.querySelectorAll('.pane').forEach(pn=>pn.classList.toggle('active', pn.id==='pane-'+p))
  if(p==='test' && !testerReady) initTester()
  history.replaceState(null,'','#'+p)
}

const EXAMPLES = {
  deploy_markdown: { markdown: "# 你好，PageFire\\n\\n这是用 **deploy_markdown** 渲染的页面。\\n\\n- 支持表格、代码块\\n- 三种主题\\n", title: "测试页", theme: "dark" },
  deploy_page: { html: "<h1>Hello PageFire</h1><p>这是 deploy_page 发布的页面。</p>", title: "测试页" },
  deploy_docs: { title: "测试文档", theme: "light", files: [
    { path: "index.md", markdown: "# 首页\\n\\n前往 [指南](./guide.md)。" },
    { path: "guide.md", markdown: "# 指南\\n\\n返回 [首页](./index.md)。" } ] },
  deploy_zip: { title: "整站", spa: false },
  list_deployments: {},
}
// which tools accept an uploaded file, and the accept filter
const UPLOAD = {
  deploy_markdown: { accept: '.md,.markdown,.txt', multiple:false, label:'上传 .md' },
  deploy_page:     { accept: '.html,.htm',         multiple:false, label:'上传 .html' },
  deploy_zip:      { accept: '.zip',               multiple:false, label:'上传 .zip' },
  deploy_docs:     { accept: '.md,.markdown',      multiple:true,  label:'上传多个 .md' },
}

function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1900) }
function setArgs(){ $('args').value = JSON.stringify(EXAMPLES[$('tool-sel').value]||{}, null, 2) }
function setArgsObj(o){ $('args').value = JSON.stringify(o, null, 2) }
function syncUpload(){
  const t=$('tool-sel').value, u=UPLOAD[t]
  if(u){ $('uprow').style.display='flex'; $('file-in').accept=u.accept; $('file-in').multiple=u.multiple; $('up-label').textContent=u.label; $('up-note').textContent='可选：上传文件自动填入参数' }
  else $('uprow').style.display='none'
}

let testerReady=false
async function initTester(){
  testerReady=true
  let ok=false
  try { const r=await fetch('/api/me',{credentials:'same-origin'}); ok=r.ok } catch{}
  if(!ok){ $('gate').style.display=''; $('tester').style.display='none'; testerReady=false; return }
  const kr=await fetch('/api/keys',{credentials:'same-origin'}); const {keys}=await kr.json()
  const active=(keys||[]).filter(k=>k.status==='active')
  if(!active.length){ $('gate').innerHTML='<div class="g-ico">🔑</div><p>你还没有可用的 API Key</p><a class="btn-primary" href="/dashboard">去控制台创建</a>'; return }
  $('gate').style.display='none'; $('tester').style.display=''
  $('key-sel').innerHTML=active.map(k=>'<option value="'+k.id+'">'+esc(k.label||k.space_id)+' ('+k.space_id+')</option>').join('')
  setArgs(); syncUpload()
}
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }
$('tool-sel').addEventListener('change', ()=>{ setArgs(); syncUpload() })

const readText = f => new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsText(f)})
const readB64  = f => new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(String(fr.result).split(',')[1]);fr.readAsDataURL(f)})

async function onFile(input){
  const t=$('tool-sel').value, files=[...input.files]
  if(!files.length) return
  try {
    if(t==='deploy_zip'){ const b64=await readB64(files[0]); setArgsObj({ zip_base64:b64, title:files[0].name.replace(/\\.zip$/,'') }) }
    else if(t==='deploy_page'){ const txt=await readText(files[0]); setArgsObj({ html:txt, title:files[0].name }) }
    else if(t==='deploy_markdown'){ const txt=await readText(files[0]); setArgsObj({ markdown:txt, title:files[0].name.replace(/\\.(md|markdown|txt)$/,''), theme:'dark' }) }
    else if(t==='deploy_docs'){ const arr=await Promise.all(files.map(async f=>({ path:f.name, markdown:await readText(f) }))); if(!arr.some(x=>x.path==='index.md')) toast('提示：文档站需含 index.md'); setArgsObj({ title:'文档站', theme:'light', files:arr }) }
    $('up-note').textContent = '✓ 已载入 ' + files.length + ' 个文件'
  } catch { toast('文件读取失败') }
}

async function run(){
  const btn=$('run-btn'), tool=$('tool-sel').value, keyId=$('key-sel').value
  let args; try { args=JSON.parse($('args').value||'{}') } catch { toast('参数不是合法 JSON'); return }
  btn.disabled=true; btn.textContent='运行中…'; $('ms').textContent=''
  try {
    const r=await fetch('/api/playground',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key_id:keyId,tool,arguments:args})})
    const d=await r.json(); showResult(r.ok&&d.ok,d); if(d.ms!=null)$('ms').textContent=d.ms+' ms'
  } catch { toast('请求失败（文件可能过大，上限 24MB）') }
  btn.disabled=false; btn.textContent='▶ 运行'
}
function showResult(ok,d){
  const res=$('res'); res.classList.add('show')
  $('res-dot').className='dot '+(ok?'ok':'err')
  $('res-label').textContent=ok?'调用成功':('失败'+(d.error?'：'+d.error:''))
  const payload=d.result!==undefined?d.result:d
  const url=payload&&payload.url, u=$('res-url')
  if(ok&&url){ u.style.display='inline-flex'; u.href=url; u.textContent='打开页面 → '+url.replace('https://','') } else u.style.display='none'
  $('res-json').textContent=JSON.stringify(payload,null,2)
}
// open the tab from #hash
const h=(location.hash||'').slice(1)
if(['tools','connect','test'].includes(h)) pick(h)
</script>
</body>
</html>`
}
