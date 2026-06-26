export function renderHome(baseDomain: string, requireInvite = false): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="通过 MCP 协议，让 AI 直接把 HTML / ZIP 发布成公网可访问页面。自托管、多租户、秒级响应。">
<title>PageFire — MCP 驱动的静态站点发布服务</title>
<link rel="icon" type="image/png" href="/favicon.ico">
<meta property="og:title" content="PageFire — AI · Create · Publish">
<meta property="og:description" content="通过 MCP 一键把 HTML / 静态包发布成公网可访问网页的自托管静态发布服务。">
<meta property="og:image" content="https://${baseDomain}/logo.png">
<meta property="og:type" content="website">
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
.t-tabs{display:flex;gap:4px;margin-left:10px}
.t-tab{background:none;border:none;color:var(--dim);font-size:12px;font-family:inherit;padding:4px 11px;border-radius:6px;cursor:pointer;transition:.15s}
.t-tab:hover{color:var(--muted)}
.t-tab.active{color:var(--fire2);background:var(--fire-dim)}
.t-body{background:#0c0c0e;padding:22px 24px;overflow-x:auto;min-height:236px}
pre{font-size:12.5px;line-height:2;color:#d4d4d8;white-space:pre;transition:opacity .25s}
pre.fade{opacity:0}
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
/* client tabs inside quickstart */
.ctabs{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}
.ctab{font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--bdr);background:transparent;color:var(--muted);cursor:pointer;transition:.15s}
.ctab.on{background:var(--fire-dim);border-color:rgba(249,115,22,.3);color:var(--fire2)}
.cpane{display:none}.cpane.on{display:block}
.dtab{font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid var(--bdr);background:transparent;color:var(--muted);cursor:pointer;transition:.15s}
.dtab.on{background:var(--fire-dim);border-color:rgba(249,115,22,.3);color:var(--fire2)}
.dpane{display:none}.dpane.on{display:block}
.cpane p{font-size:13px;color:var(--muted);margin-bottom:8px;line-height:1.6}
.cpane code{display:block;background:#0c0c0e;border:1px solid var(--bdr);border-radius:9px;padding:13px 16px;font-size:12px;color:#a3e635;overflow-x:auto;white-space:pre;margin-bottom:8px}
.cpane .note{font-size:12px;color:var(--dim);margin-top:6px}

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
  <a class="logo" href="/"><img src="/logo.png" alt="PageFire" style="height:30px;width:auto;display:block"></a>
  <div class="nav-r">
    <a href="#features">功能</a>
    <a href="#examples">示例</a>
    <a href="/playground">Playground</a>
    <a href="#quickstart">接入</a>
    <span id="nav-auth">
      <a onclick="showAuth('login')" class="nav-login">登录</a>
      <a onclick="showAuth('register')" class="nav-reg">注册</a>
    </span>
    <span id="nav-user" style="display:none;align-items:center;gap:6px">
      <a href="/dashboard" class="nav-reg">进入控制台 →</a>
    </span>
  </div>
</div></nav>

<main>
<div class="sec hero w">
  <div class="badge"><span class="ping"></span>MCP 驱动 · 自托管 · 即发即得</div>
  <h1>对 AI 说一句话，<br>内容秒变在线网页</h1>
  <p class="hero-sub">PageFire 给 Claude、Cursor 等 AI 一个"发布"能力——HTML、Markdown、整站 ZIP 一句话变成公网 HTTPS 链接，无需服务器，不碰部署流程。</p>
  <div class="btns">
    <a class="bp" onclick="showAuth('register')">免费开始 →</a>
    <a class="bg" href="/playground">在线试用 →</a>
  </div>

  <div class="term">
    <div class="t-bar">
      <div class="d dr"></div><div class="d dy"></div><div class="d dg"></div>
      <div class="t-tabs">
        <button class="t-tab active" data-i="0" onclick="pickScene(0)">单页</button>
        <button class="t-tab" data-i="1" onclick="pickScene(1)">Markdown</button>
        <button class="t-tab" data-i="2" onclick="pickScene(2)">文档站</button>
      </div>
    </div>
    <div class="t-body"><pre id="scene"></pre></div>
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
      <h3>访问控制与有效期</h3>
      <p>一键切换公开或密码访问；页面可设自动过期，也可永久保留，敏感内容只给指定的人看。</p>
    </div>
    <div class="feat">
      <div class="fi">🛡️</div>
      <h3>数据自主可控</h3>
      <p>完全自托管，所有页面与数据都在你自己的服务器上，不依赖任何第三方平台，随时可迁移。</p>
    </div>
  </div>
</div></div>

<div class="sec" id="examples" style="padding-top:0"><div class="w">
  <div class="stag">实时示例</div>
  <h2>看看真实效果</h2>
  <p class="ssub">下面都是用 PageFire 发布的真实页面，点开即可访问。</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
    <a class="feat" href="https://demosite-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">⚡</div>
      <h3>产品落地页 <span style="color:var(--dim);font-weight:400">deploy_page</span></h3>
      <p>某 AI 团队用 PageFire 发布的 SaaS 产品落地页，AI 生成 HTML 后一句话上线，全程不碰服务器。<span style="color:var(--fire2)">打开 →</span></p>
    </a>
    <a class="feat" href="https://demoarticle-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">📝</div>
      <h3>技术文章 <span style="color:var(--dim);font-weight:400">deploy_markdown</span></h3>
      <p>《MCP 协议详解》，开发者把 Markdown 丢给 Claude，秒发为精致排版的公开技术文章。<span style="color:var(--fire2)">打开 →</span></p>
    </a>
    <a class="feat" href="https://demodocs-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">📖</div>
      <h3>开发者文档站 <span style="color:var(--dim);font-weight:400">deploy_docs</span></h3>
      <p>某团队把 API 文档的多篇 Markdown 一次发布为带侧栏导航的文档站，更新只需重新运行工具。<span style="color:var(--fire2)">打开 →</span></p>
    </a>
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
        <p>按你使用的客户端配置 MCP 连接：</p>
        <div class="ctabs">
          <button class="ctab on" onclick="qpick('claude')">Claude Desktop / Code</button>
          <button class="ctab" onclick="qpick('cursor')">Cursor</button>
          <button class="ctab" onclick="qpick('codex')">OpenAI Codex</button>
          <button class="ctab" onclick="qpick('other')">其他客户端</button>
        </div>
        <div class="cpane on" id="qp-claude">
          <p><b>方式一 · HTTP 直连（推荐，零依赖）</b><br>在项目根目录创建 <span class="inline-c">.mcp.json</span>，加入 <span class="inline-c">.gitignore</span> 后不会提交 token：</p>
          <code>{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.${baseDomain}/mcp",
      "headers": { "Authorization": "Bearer &lt;你的token&gt;" }
    }
  }
}</code>
          <div class="note">Claude Code CLI 也可用命令添加：<span class="inline-c">claude mcp add --transport http pagefire https://mcp.${baseDomain}/mcp -H "Authorization: Bearer &lt;token&gt;"</span></div>
          <p style="margin-top:16px"><b>方式二 · stdio 桥接（连不上时的兜底）</b><br>若方式一报 <span class="inline-c">Failed to connect</span>，但浏览器 / Node 能访问该域名，多为客户端运行时的 TLS 被网络按指纹拦截。改用本机 Node 的 <a href="https://www.npmjs.com/package/mcp-remote" target="_blank" rel="noopener">mcp-remote</a> 以 stdio 桥接同一端点（需本机 Node ≥ 18 / npx）：</p>
          <code>{
  "mcpServers": {
    "pagefire": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp.${baseDomain}/mcp",
        "--header", "Authorization:\${AUTH_HEADER}",
        "--transport", "http-only"
      ],
      "env": { "AUTH_HEADER": "Bearer &lt;你的token&gt;" }
    }
  }
}</code>
          <div class="note">⚠️ token 须经 <span class="inline-c">env.AUTH_HEADER</span> 传入、header 写成 <span class="inline-c">Authorization:\${AUTH_HEADER}</span>（中间无空格）。若直接写 <span class="inline-c">"Authorization: Bearer ..."</span>，空格会在进程拼接时被拆断，导致握手成功但工具调用报 <span class="inline-c">UNAUTHORIZED</span>。</div>
          <p style="margin-top:16px"><b>方式三 · npm 连接器包（最简，推荐）</b><br>已发布 <a href="https://www.npmjs.com/package/pagefire-mcp" target="_blank" rel="noopener">pagefire-mcp</a>，token 只走环境变量，无 URL、无 header 拆断坑：</p>
          <code>{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "pagefire-mcp@latest"],
      "env": { "PAGEFIRE_TOKEN": "pf_&lt;你的token&gt;" }
    }
  }
}</code>
        </div>
        <div class="cpane" id="qp-cursor">
          <p>打开 Cursor → Settings → MCP → <b>Add new global MCP server</b>，填入：</p>
          <code>{
  "pagefire": {
    "url": "https://mcp.${baseDomain}/mcp",
    "headers": { "Authorization": "Bearer &lt;你的token&gt;" }
  }
}</code>
          <div class="note">Cursor 使用全局 MCP 配置，不读取项目目录的 .mcp.json。</div>
        </div>
        <div class="cpane" id="qp-codex">
          <p>在 <span class="inline-c">codex.yaml</span>（或 <span class="inline-c">~/.codex/config.yaml</span>）中添加：</p>
          <code>mcp_servers:
  - name: pagefire
    type: http
    url: https://mcp.${baseDomain}/mcp
    headers:
      Authorization: "Bearer &lt;你的token&gt;"</code>
          <div class="note">Codex CLI 支持 Streamable HTTP transport，重启后工具列表自动出现。</div>
        </div>
        <div class="cpane" id="qp-other">
          <p>任何支持 <b>Streamable HTTP transport</b> 的 MCP 客户端均可接入，填入以下两个信息：</p>
          <code>端点：https://mcp.${baseDomain}/mcp
鉴权：Authorization: Bearer &lt;你的token&gt;
协议：MCP 2025-03-26 (Streamable HTTP)</code>
          <div class="note">若客户端原生连接报 <span class="inline-c">Failed to connect</span>（但浏览器 / Node 能访问域名），可用 <span class="inline-c">npx mcp-remote &lt;端点&gt; --header "Authorization:\${AUTH_HEADER}" --transport http-only</span> 以 stdio 桥接（token 经 <span class="inline-c">env.AUTH_HEADER</span> 传入，避免空格拆断）。详见 <a href="/playground#connect">Playground → 接入</a>。</div>
        </div>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn">3</div>
      <div class="qb">
        <p>重新加载客户端，直接用一句话发布——不同客户端的对话入口如下：</p>
        <div class="ctabs" id="dp-tabs">
          <button class="dtab on" onclick="dpick('claude')">Claude Desktop / Code</button>
          <button class="dtab" onclick="dpick('cursor')">Cursor</button>
          <button class="dtab" onclick="dpick('codex')">OpenAI Codex</button>
          <button class="dtab" onclick="dpick('other')">其他客户端</button>
        </div>
        <div class="dpane on" id="dp-claude">
          <code>帮我把这份内容发布成公网网页，永久保留。</code>
          <div class="note">在对话框直接输入，Claude 自动调用 PageFire 工具并返回 HTTPS 链接。</div>
        </div>
        <div class="dpane" id="dp-cursor">
          <code>把这份内容发布成网页。</code>
          <div class="note">在 Cursor 的 Agent 模式（<span class="inline-c">Cmd/Ctrl+I</span>）下输入，会自动调用已配置的 MCP 工具。</div>
        </div>
        <div class="dpane" id="dp-codex">
          <code>把这份内容发布成网页。</code>
          <div class="note">Codex CLI 识别到 PageFire 工具后，按需调用 <span class="inline-c">deploy_*</span> 完成发布。</div>
        </div>
        <div class="dpane" id="dp-other">
          <code>把这份内容发布成网页。</code>
          <div class="note">任何支持 MCP 工具调用的客户端，用自然语言描述即可，无需写代码。</div>
        </div>
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
      <a class="bg" href="/playground">在线试用 Playground</a>
    </div>
  </div>
</div></div>
</main>

<footer><div class="w fi-row">
  <div class="fc">© 2026 PageFire · Self-hosted MCP static publisher</div>
  <div class="fl">
    <a href="/playground">Playground</a>
    <a href="#quickstart">接入文档</a>
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
    <div style="margin-bottom:14px">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">密码</label>
      <input id="f-password" type="password" autocomplete="current-password" placeholder="至少 6 位"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div id="invite-wrap" style="margin-bottom:20px;display:none">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">邀请码${requireInvite ? ' <span style="color:#f87171">*</span>' : ' <span style="color:var(--dim)">(可选)</span>'}</label>
      <input id="f-invite" placeholder="邀请码"
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
// ── Interactive hero demo: switchable / auto-rotating scenarios ───────────────
const C = (cls, t) => '<span class="' + cls + '">' + t + '</span>'
const SCENES = [
  C('cm','// 你对 AI 说') + '\\n' +
  C('str','"把这份产品介绍发布成网页，永久保留"') + '\\n\\n' +
  C('cm','// PageFire 自动执行') + '\\n' +
  C('fn','deploy_page') + '({ html: ' + C('str','"&lt;h1&gt;...&lt;/h1&gt;"') + ', pin: ' + C('kw','true') + ' })\\n\\n' +
  C('cm','// ✓ 几秒后返回') + '\\n' +
  '{ url: ' + C('str','"https://f4vyog-3ixketu6.${baseDomain}/"') + ' }',

  C('cm','// 你对 AI 说') + '\\n' +
  C('str','"把这篇 Markdown 发布成网页，用暗色主题"') + '\\n\\n' +
  C('cm','// PageFire 自动执行') + '\\n' +
  C('fn','deploy_markdown') + '({ markdown: ' + C('str','"# 标题..."') + ', theme: ' + C('str','"dark"') + ' })\\n\\n' +
  C('cm','// ✓ 自动套用精致排版') + '\\n' +
  '{ url: ' + C('str','"https://ragdemo-bmwvx12a.${baseDomain}/"') + ' }',

  C('cm','// 你对 AI 说') + '\\n' +
  C('str','"把这套文档做成带侧栏的文档站"') + '\\n\\n' +
  C('cm','// PageFire 自动执行') + '\\n' +
  C('fn','deploy_docs') + '({ files: [' + C('str','"index.md"') + ', ' + C('str','"guide.md"') + ', ...] })\\n\\n' +
  C('cm','// ✓ 多页 + 导航一次生成') + '\\n' +
  '{ url: ' + C('str','"https://pfdocs-vguan2uk.${baseDomain}/"') + ' }',
]
let sceneI = 0, sceneTimer = null
const sceneEl = document.getElementById('scene')
function renderScene(i){
  sceneEl.classList.add('fade')
  setTimeout(() => {
    sceneEl.innerHTML = SCENES[i]
    document.querySelectorAll('.t-tab').forEach(b => b.classList.toggle('active', +b.dataset.i === i))
    sceneEl.classList.remove('fade')
  }, 200)
}
function pickScene(i){ sceneI = i; renderScene(i); clearInterval(sceneTimer); sceneTimer = setInterval(autoScene, 4500) }
function autoScene(){ sceneI = (sceneI + 1) % SCENES.length; renderScene(sceneI) }
sceneEl.innerHTML = SCENES[0]
sceneTimer = setInterval(autoScene, 4500)

// ── Session-aware nav: show dashboard link when logged in ─────────────────────
;(async () => {
  try {
    const r = await fetch('/api/me', { credentials: 'same-origin' })
    if (!r.ok) return
    document.getElementById('nav-auth').style.display = 'none'
    const nu = document.getElementById('nav-user'); nu.style.display = 'inline-flex'
  } catch {}
})()

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
function qpick(id) {
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('on'))
  document.querySelectorAll('.cpane').forEach(p => p.classList.remove('on'))
  event.currentTarget.classList.add('on')
  document.getElementById('qp-' + id).classList.add('on')
}
function dpick(id) {
  document.querySelectorAll('.dtab').forEach(t => t.classList.remove('on'))
  document.querySelectorAll('.dpane').forEach(p => p.classList.remove('on'))
  event.currentTarget.classList.add('on')
  document.getElementById('dp-' + id).classList.add('on')
}
</script>
</body>
</html>`
}
