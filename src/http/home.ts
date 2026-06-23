export function renderHome(baseDomain: string, requireInvite = false): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="通过 MCP 协议，让 AI 直接把 HTML / ZIP 发布成公网可访问页面。自托管、多租户、秒级响应。">
<title>PageFire — MCP 驱动的静态站点发布服务</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0b;--bg2:#0f0f11;--sur:rgba(255,255,255,.025);--sur2:rgba(255,255,255,.045);
  --bdr:rgba(255,255,255,.08);--bdr2:rgba(255,255,255,.14);
  --txt:#fafafa;--muted:#a1a1aa;--dim:#71717a;
  --fire:#f97316;--fire2:#fb923c;--fire-dim:rgba(249,115,22,.12)
}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
body{background:var(--bg);color:var(--txt);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;overflow-x:hidden;line-height:1.6}
a{text-decoration:none;color:inherit}
code{font-family:'SF Mono',ui-monospace,'Fira Code',Consolas,monospace}

.w{position:relative;z-index:1;max-width:1040px;margin:0 auto;padding:0 24px}

/* subtle top glow only — no orbs, no purple */
.glow{position:fixed;top:-260px;left:50%;transform:translateX(-50%);width:900px;height:520px;background:radial-gradient(ellipse at center,rgba(249,115,22,.10),transparent 65%);pointer-events:none;z-index:0}

/* nav */
nav{position:sticky;top:0;z-index:100;border-bottom:1px solid var(--bdr);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);background:rgba(10,10,11,.78)}
.nav-i{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:650;color:var(--txt);letter-spacing:-.2px}
.flame{width:28px;height:28px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);border-radius:8px;display:grid;place-items:center;font-size:14px;flex-shrink:0}
.nav-r{display:flex;align-items:center;gap:6px}
.nav-r a{color:var(--muted);font-size:13.5px;padding:7px 12px;border-radius:8px;transition:.15s;cursor:pointer}
.nav-r a:hover{color:var(--txt);background:var(--sur)}
.nav-login{border:1px solid var(--bdr)}
.nav-reg{background:#fafafa !important;color:#0a0a0b !important;font-weight:600}
.nav-reg:hover{background:#e4e4e7 !important}

/* hero */
.hero{padding:104px 0 76px;text-align:center}
.badge{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 11px;border-radius:100px;background:var(--sur);border:1px solid var(--bdr);font-size:12.5px;color:var(--muted);margin-bottom:30px}
.ping{width:7px;height:7px;border-radius:50%;background:var(--fire);box-shadow:0 0 9px var(--fire);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
h1{font-size:clamp(38px,6.5vw,68px);font-weight:720;line-height:1.05;letter-spacing:-2.4px;margin-bottom:22px;color:#fff}
.hero-sub{font-size:clamp(14px,2vw,17px);color:var(--muted);max-width:500px;margin:0 auto 38px;line-height:1.75}
.btns{display:flex;gap:11px;justify-content:center;flex-wrap:wrap;margin-bottom:60px}
.bp{padding:12px 24px;border-radius:10px;background:#fafafa;color:#0a0a0b;font-size:14px;font-weight:600;transition:.18s;white-space:nowrap}
.bp:hover{background:#e4e4e7;transform:translateY(-1px)}
.bg{padding:12px 24px;border-radius:10px;border:1px solid var(--bdr);color:var(--txt);font-size:14px;font-weight:500;background:var(--sur);transition:.18s;white-space:nowrap}
.bg:hover{background:var(--sur2);border-color:var(--bdr2)}

/* code terminal */
.term{max-width:640px;margin:0 auto;border-radius:13px;overflow:hidden;border:1px solid var(--bdr);box-shadow:0 30px 80px rgba(0,0,0,.5)}
.t-bar{background:#141416;padding:11px 15px;display:flex;align-items:center;gap:7px;border-bottom:1px solid var(--bdr)}
.d{width:11px;height:11px;border-radius:50%}
.dr{background:#ff5f57}.dy{background:#febc2e}.dg{background:#28c840}
.t-title{font-size:12px;color:var(--dim);margin-left:7px}
.t-body{background:#0c0c0e;padding:22px 24px;overflow-x:auto}
pre{font-size:12.5px;line-height:2;color:#d4d4d8;white-space:pre}
.kw{color:var(--fire2)}.fn{color:#fafafa;font-weight:600}.str{color:#a3e635}.cm{color:#52525b}.num{color:var(--fire2)}

/* stats */
.stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:54px;border-radius:13px;border:1px solid var(--bdr);overflow:hidden}
.stat{background:var(--bg2);padding:24px 12px;text-align:center;border-right:1px solid var(--bdr)}
.stat:last-child{border-right:none}
.sv{font-size:27px;font-weight:720;letter-spacing:-1px;color:#fff;line-height:1}
.sv .u{color:var(--fire);font-size:18px}
.sl{font-size:12px;color:var(--dim);margin-top:7px}

/* sections */
.sec{padding:84px 0}
.stag{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--fire);font-weight:700;margin-bottom:14px}
h2{font-size:clamp(23px,3.5vw,34px);font-weight:700;letter-spacing:-.8px;margin-bottom:10px;color:#fafafa}
.ssub{color:var(--muted);font-size:15px;line-height:1.7;max-width:440px}

/* feature grid */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1px;background:var(--bdr);border-radius:14px;overflow:hidden;margin-top:46px}
.feat{background:var(--bg2);padding:28px;transition:.18s}
.feat:hover{background:var(--sur)}
.fi{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-size:18px;margin-bottom:18px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.18)}
.feat h3{font-size:14.5px;font-weight:650;margin-bottom:8px;color:#fafafa}
.feat p{font-size:13px;color:var(--muted);line-height:1.7}
.feat code,.inline-c{font-size:12px;color:var(--fire2);background:var(--fire-dim);padding:1px 6px;border-radius:5px}

/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bdr);border-radius:13px;overflow:hidden;margin-top:44px}
.step{background:var(--bg2);padding:28px 24px}
.sn{font-size:11px;color:var(--fire);margin-bottom:12px;font-weight:700;letter-spacing:.05em}
.step h4{font-size:14.5px;font-weight:650;margin-bottom:8px;color:#fafafa}
.step p{font-size:13px;color:var(--muted);line-height:1.7}
.step code{font-size:12px;color:#a3e635;background:rgba(163,230,53,.08);padding:1px 5px;border-radius:4px}

/* quickstart */
.qs{background:var(--bg2);border:1px solid var(--bdr);border-radius:14px;padding:30px 34px;margin-top:44px}
.qs-item{display:flex;gap:16px;padding:18px 0;border-bottom:1px solid var(--bdr)}
.qs-item:last-child{border-bottom:none;padding-bottom:0}
.qs-item:first-child{padding-top:0}
.qn{width:26px;height:26px;border-radius:8px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);color:var(--fire2);font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0;margin-top:1px}
.qb{flex:1;min-width:0}
.qb p{font-size:13.5px;color:var(--muted);margin-bottom:9px}
.qb a{color:var(--fire2)}
.qb code{display:block;background:#0c0c0e;border:1px solid var(--bdr);border-radius:9px;padding:13px 16px;font-size:12px;color:#a3e635;overflow-x:auto;white-space:pre}

/* cta */
.cta-box{border:1px solid var(--bdr);border-radius:18px;padding:64px 40px;text-align:center;background:var(--bg2);position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-120px;left:50%;transform:translateX(-50%);width:500px;height:280px;background:radial-gradient(ellipse,var(--fire-dim),transparent 70%)}
.cta-box>*{position:relative}

/* footer */
footer{border-top:1px solid var(--bdr);padding:22px 0}
.fi-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.fc{font-size:12px;color:var(--dim)}
.fl{display:flex;gap:16px}
.fl a{font-size:12px;color:var(--dim);transition:.15s}
.fl a:hover{color:var(--fire2)}

@media(max-width:680px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .stat:nth-child(2){border-right:none}
  .stat:nth-child(1),.stat:nth-child(2){border-bottom:1px solid var(--bdr)}
  .steps{grid-template-columns:1fr}
  .grid{grid-template-columns:1fr}
  .cta-box{padding:44px 22px}
  .hero{padding:68px 0 54px}
}
</style>
</head>
<body>
<div class="glow"></div>

<nav><div class="w nav-i">
  <a class="logo" href="/"><span class="flame">🔥</span>PageFire</a>
  <div class="nav-r">
    <a href="#features">功能</a>
    <a href="#quickstart">接入</a>
    <a onclick="showAuth('login')" class="nav-login">登录</a>
    <a onclick="showAuth('register')" class="nav-reg">注册</a>
  </div>
</div></nav>

<main>
<div class="sec hero w">
  <div class="badge"><span class="ping"></span>MCP 驱动 · 自托管 · 开源</div>
  <h1>让 AI 直接发布<br>静态网页</h1>
  <p class="hero-sub">通过 MCP 协议，AI 把 HTML / ZIP 发布成公网 HTTPS 页面，3 秒内完成。自托管、多租户，无需任何 CI/CD 流水线。</p>
  <div class="btns">
    <a class="bp" onclick="showAuth('register')">免费开始 →</a>
    <a class="bg" href="#quickstart">5 分钟接入</a>
  </div>

  <div class="term">
    <div class="t-bar">
      <div class="d dr"></div><div class="d dy"></div><div class="d dg"></div>
      <span class="t-title">Claude Desktop — MCP 工具调用示例</span>
    </div>
    <div class="t-body"><pre><span class="cm">// 你对 AI 说一句话</span>
<span class="str">"把这份产品介绍发布成公网网页，永久保留"</span>

<span class="cm">// PageFire MCP 自动执行</span>
<span class="fn">deploy_page</span>({
  html: <span class="str">"&lt;h1&gt;Hello World&lt;/h1&gt;..."</span>,
  pin: <span class="kw">true</span>
})

<span class="cm">// ✓ 2 秒后返回可访问地址</span>
{ url: <span class="str">"https://f4vyog-3ixketu6.${baseDomain}/"</span> }</pre></div>
  </div>

  <div class="stats">
    <div class="stat"><div class="sv"><span class="u">&lt;</span>3s</div><div class="sl">从调用到上线</div></div>
    <div class="stat"><div class="sv">11</div><div class="sl">MCP 工具</div></div>
    <div class="stat"><div class="sv">0</div><div class="sl">额外部署步骤</div></div>
    <div class="stat"><div class="sv">SPA</div><div class="sl">客户端路由支持</div></div>
  </div>
</div>

<div class="sec" id="features"><div class="w">
  <div class="stag">核心能力</div>
  <h2>为 AI 工作流设计的发布层</h2>
  <p class="ssub">不是传统部署工具，而是让 AI 直接控制发布的基础设施层。</p>
  <div class="grid">
    <div class="feat">
      <div class="fi">⚡</div>
      <h3><code>deploy_page</code> — 单页发布</h3>
      <p>传入 HTML 字符串，秒内获得独立 HTTPS 子域名。最适合 AI 生成的报告、演示、落地页。</p>
    </div>
    <div class="feat">
      <div class="fi">📦</div>
      <h3><code>deploy_zip</code> — 完整站点</h3>
      <p>上传 ZIP 包，自动解压发布。支持 React / Vue 打包产物，开启 SPA 模式客户端路由不会 404。</p>
    </div>
    <div class="feat">
      <div class="fi">📝</div>
      <h3><code>deploy_markdown</code> — 一键渲染</h3>
      <p>传入 Markdown 即生成精致排版网页，内置 light / dark / sepia 三主题，无需手写 HTML/CSS。</p>
    </div>
    <div class="feat">
      <div class="fi">📖</div>
      <h3><code>deploy_docs</code> — 文档站</h3>
      <p>多篇 Markdown 自动生成带侧边导航的文档站，跨页链接自动改写，GitBook 风格开箱即用。</p>
    </div>
    <div class="feat">
      <div class="fi">🔗</div>
      <h3>链接不变更新</h3>
      <p>给站点起个 <code>did</code> 名字，重发即原地覆盖、<strong>URL 永久不变</strong>，分享出去的链接始终有效。</p>
    </div>
    <div class="feat">
      <div class="fi">🔒</div>
      <h3>密码保护 · TTL · Pin</h3>
      <p><code>set_access</code> 切换密码访问；默认 7 天过期，<code>pin</code> 永久保留，GC 自动清理。</p>
    </div>
    <div class="feat">
      <div class="fi">🏠</div>
      <h3>真正自托管</h3>
      <p>单 Node 进程 + SQLite WAL，复用现有 nginx。内存 &lt;150 MB，可与其它服务无摩擦共存。</p>
    </div>
  </div>
</div></div>

<div class="sec" style="padding-top:0"><div class="w">
  <div class="stag">工作流程</div>
  <h2>三步，零配置</h2>
  <div class="steps">
    <div class="step">
      <div class="sn">01 · 配置</div>
      <h4>加入 MCP 服务器</h4>
      <p>在 <code>.mcp.json</code> 填入服务地址和 Bearer Token，加入 AI 客户端（Claude / Cursor）。</p>
    </div>
    <div class="step">
      <div class="sn">02 · 对话</div>
      <h4>告诉 AI 发布什么</h4>
      <p>用自然语言描述，AI 自动调用 <code>deploy_page</code> 或 <code>deploy_zip</code> 工具完成发布。</p>
    </div>
    <div class="step">
      <div class="sn">03 · 访问</div>
      <h4>获得公网 URL</h4>
      <p>HTTPS 子域名即时可用，无需登录，直接分享给任何人访问。支持密码保护。</p>
    </div>
  </div>
</div></div>

<div class="sec" id="quickstart" style="padding-top:0"><div class="w">
  <div class="stag">快速接入</div>
  <h2>5 分钟接入</h2>
  <div class="qs">
    <div class="qs-item">
      <div class="qn">1</div>
      <div class="qb">
        <p><a onclick="showAuth('register')" style="cursor:pointer">注册账户</a>，在控制台创建 API Key（<span class="inline-c">pf_</span> 开头的密钥）</p>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn">2</div>
      <div class="qb">
        <p>在项目根目录创建 <span class="inline-c">.mcp.json</span>（加入 .gitignore，不要提交）</p>
        <code>{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.${baseDomain}/mcp",
      "headers": { "Authorization": "Bearer &lt;你的token&gt;" }
    }
  }
}</code>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn">3</div>
      <div class="qb">
        <p>重新加载 MCP 插件，在 Claude / Cursor 中直接对话发布：</p>
        <code>帮我把这份产品介绍发布成网页，永久保留。</code>
      </div>
    </div>
  </div>
</div></div>

<div class="sec"><div class="w">
  <div class="cta-box">
    <h2>开始使用 PageFire</h2>
    <p style="color:var(--muted);font-size:15px;margin:14px auto 34px;line-height:1.7;max-width:440px">注册即可在控制台自助创建 API Key，数据完全自主可控。从注册到第一个页面上线，不超过 5 分钟。</p>
    <div class="btns">
      <a class="bp" onclick="showAuth('register')">免费开始 →</a>
      <a class="bg" href="https://github.com/bradyliuY/page-fire">GitHub 源码</a>
    </div>
  </div>
</div></div>
</main>

<footer><div class="w fi-row">
  <div class="fc">© 2026 PageFire · Self-hosted MCP static publisher · MIT License</div>
  <div class="fl">
    <a href="https://github.com/bradyliuY/page-fire">GitHub</a>
    <a href="https://mcp.${baseDomain}/mcp">MCP 端点</a>
  </div>
</div></footer>

<!-- Auth Modal -->
<div id="modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)closeAuth()">
<div style="background:#121214;border:1px solid var(--bdr2);border-radius:16px;padding:30px 28px;width:100%;max-width:400px;position:relative">
  <button onclick="closeAuth()" style="position:absolute;top:14px;right:17px;background:none;border:none;color:var(--dim);font-size:22px;cursor:pointer;line-height:1">×</button>

  <div style="display:flex;gap:0;margin-bottom:26px;border-bottom:1px solid var(--bdr)">
    <button id="tab-register" onclick="switchTab('register')" style="flex:1;background:none;border:none;padding:11px 0;font-size:14px;font-weight:600;cursor:pointer;color:var(--fire);border-bottom:2px solid var(--fire);transition:.15s">注册</button>
    <button id="tab-login" onclick="switchTab('login')" style="flex:1;background:none;border:none;padding:11px 0;font-size:14px;font-weight:500;cursor:pointer;color:var(--dim);border-bottom:2px solid transparent;transition:.15s">登录</button>
  </div>

  <form id="auth-form" onsubmit="submitAuth(event)">
    <div style="margin-bottom:14px">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">用户名</label>
      <input id="f-username" autocomplete="username" placeholder="3–20 位，仅 a-z 0-9 _ -"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div id="invite-wrap" style="margin-bottom:14px;display:none">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">邀请码${requireInvite ? ' <span style="color:#f87171">*</span>' : ' <span style="color:var(--dim)">(可选)</span>'}</label>
      <input id="f-invite" placeholder="邀请码"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">密码</label>
      <input id="f-password" type="password" autocomplete="current-password" placeholder="至少 6 位"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div id="auth-err" style="display:none;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);border-radius:8px;padding:9px 12px;font-size:13px;color:#fca5a5;margin-bottom:14px"></div>
    <button id="auth-btn" type="submit"
      style="width:100%;padding:12px;border-radius:10px;background:#fafafa;color:#0a0a0b;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:.18s">
      创建账户
    </button>
  </form>

  <!-- token result (shown after register success) -->
  <div id="auth-ok" style="display:none;text-align:center">
    <div style="width:46px;height:46px;border-radius:12px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:22px;margin:0 auto 14px">🔑</div>
    <div style="font-size:16px;font-weight:660;margin-bottom:4px;color:#fafafa">账户创建成功</div>
    <div style="font-size:13px;color:var(--dim);margin-bottom:16px">这是你的第一个 API Key，仅显示一次</div>
    <div style="position:relative">
      <code id="ok-token" style="display:block;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:12px 46px 12px 14px;font-size:12px;color:var(--fire2);word-break:break-all;text-align:left;line-height:1.6"></code>
      <button onclick="copyToken()" title="复制"
        style="position:absolute;right:9px;top:9px;background:var(--sur2);border:1px solid var(--bdr);border-radius:7px;padding:5px 9px;color:var(--muted);cursor:pointer;font-size:12px">复制</button>
    </div>
    <div id="ok-space" style="font-size:12px;color:var(--dim);margin:10px 0 18px"></div>
    <a href="/dashboard" style="display:block;width:100%;padding:11px;border-radius:10px;background:#fafafa;color:#0a0a0b;font-size:14px;font-weight:600">进入控制台 →</a>
  </div>
</div></div>

<script>
const modal = document.getElementById('modal')
let curTab = 'register'

function showAuth(tab) {
  modal.style.display = 'flex'
  switchTab(tab || 'register')
  setTimeout(() => document.getElementById('f-username').focus(), 50)
}
function closeAuth() { modal.style.display = 'none'; resetForm() }
function resetForm() {
  document.getElementById('auth-form').style.display = ''
  document.getElementById('auth-ok').style.display = 'none'
  document.getElementById('auth-err').style.display = 'none'
  document.getElementById('f-username').value = ''
  document.getElementById('f-password').value = ''
  document.getElementById('f-invite').value = ''
}
function switchTab(tab) {
  curTab = tab
  const isReg = tab === 'register'
  document.getElementById('tab-register').style.color = isReg ? 'var(--fire)' : 'var(--dim)'
  document.getElementById('tab-register').style.borderBottomColor = isReg ? 'var(--fire)' : 'transparent'
  document.getElementById('tab-login').style.color = isReg ? 'var(--dim)' : 'var(--fire)'
  document.getElementById('tab-login').style.borderBottomColor = isReg ? 'transparent' : 'var(--fire)'
  document.getElementById('auth-btn').textContent = isReg ? '创建账户' : '登录'
  document.getElementById('invite-wrap').style.display = isReg ? '' : 'none'
  document.getElementById('auth-err').style.display = 'none'
}
async function submitAuth(e) {
  e.preventDefault()
  const btn = document.getElementById('auth-btn')
  const errEl = document.getElementById('auth-err')
  errEl.style.display = 'none'
  btn.disabled = true; btn.textContent = '请稍候…'
  const body = {
    username: document.getElementById('f-username').value.trim(),
    password: document.getElementById('f-password').value,
  }
  if (curTab === 'register') {
    const ic = document.getElementById('f-invite').value.trim()
    if (ic) body.invite_code = ic
  }
  try {
    const r = await fetch('/api/' + curTab, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      credentials: 'same-origin', body: JSON.stringify(body)
    })
    const d = await r.json()
    if (!r.ok) { errEl.textContent = d.error || '操作失败'; errEl.style.display = '' }
    else if (curTab === 'login') {
      location.href = '/dashboard'
    } else {
      document.getElementById('auth-form').style.display = 'none'
      document.getElementById('auth-ok').style.display = ''
      document.getElementById('ok-token').textContent = d.token || ''
      document.getElementById('ok-space').textContent = d.space_id ? '子域名空间：' + d.space_id + '.${baseDomain}' : ''
    }
  } catch { errEl.textContent = '网络错误，请重试'; errEl.style.display = '' }
  btn.disabled = false; btn.textContent = curTab === 'register' ? '创建账户' : '登录'
}
function copyToken() {
  const t = document.getElementById('ok-token').textContent
  navigator.clipboard.writeText(t).then(() => {
    const b = event.target; b.textContent = '已复制'; setTimeout(() => b.textContent = '复制', 1500)
  })
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAuth() })
</script>
</body>
</html>`
}
