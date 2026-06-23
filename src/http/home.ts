export function renderHome(baseDomain: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="通过 MCP 协议，让 AI 直接把 HTML / ZIP 发布成公网可访问页面。自托管、多租户、秒级响应。">
<title>PageFire — MCP 驱动的静态站点发布服务</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--v:#8b5cf6;--f:#d946ef;--c:#22d3ee;--bg:#050510;--sur:rgba(255,255,255,.04);--bdr:rgba(255,255,255,.08)}
html{scroll-behavior:smooth}
body{background:var(--bg);color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;min-height:100vh;overflow-x:hidden}

/* orbs */
.orbs{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:.25;animation:drift 20s ease-in-out infinite}
.orb1{width:700px;height:700px;background:radial-gradient(circle,#7c3aed,transparent 70%);top:-200px;left:-200px}
.orb2{width:500px;height:500px;background:radial-gradient(circle,#0891b2,transparent 70%);bottom:-100px;right:-100px;animation-delay:-9s}
.orb3{width:400px;height:400px;background:radial-gradient(circle,#c026d3,transparent 70%);top:40%;left:50%;transform:translateX(-50%);animation-delay:-16s}
@keyframes drift{0%,100%{transform:translate(0,0)}40%{transform:translate(30px,-20px)}70%{transform:translate(-20px,30px)}}

.wrap{position:relative;z-index:1;max-width:1060px;margin:0 auto;padding:0 24px}

/* nav */
nav{position:sticky;top:0;z-index:100;padding:14px 0;backdrop-filter:blur(24px);border-bottom:1px solid var(--bdr)}
.nav-i{display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700;text-decoration:none;color:#fff}
.logo-ic{width:32px;height:32px;background:linear-gradient(135deg,var(--v),var(--f));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.nav-links{display:flex;gap:6px}
.nav-links a{color:#94a3b8;text-decoration:none;font-size:14px;padding:6px 12px;border-radius:8px;transition:all .2s}
.nav-links a:hover{color:#f1f5f9;background:rgba(255,255,255,.06)}
.nav-links .gh{border:1px solid var(--bdr);color:#e2e8f0}

/* hero */
.hero{padding:110px 0 70px;text-align:center}
.hero-tag{display:inline-flex;align-items:center;gap:7px;padding:6px 16px;border-radius:24px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);font-size:13px;color:#c4b5fd;margin-bottom:28px}
.dot{width:6px;height:6px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 8px #8b5cf6;animation:blink 2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:clamp(38px,7vw,74px);font-weight:800;line-height:1.07;letter-spacing:-2.5px;margin-bottom:20px}
.grad{background:linear-gradient(135deg,#fff 0%,#c4b5fd 45%,#67e8f9 85%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sub{font-size:clamp(15px,2vw,18px);color:#94a3b8;max-width:520px;margin:0 auto 44px;line-height:1.75}
.btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:64px}
.btn-p{padding:13px 28px;border-radius:12px;background:linear-gradient(135deg,var(--v),var(--f));color:#fff;font-size:15px;font-weight:600;text-decoration:none;box-shadow:0 0 36px rgba(139,92,246,.38);transition:all .3s}
.btn-p:hover{box-shadow:0 0 56px rgba(139,92,246,.6);transform:translateY(-2px)}
.btn-g{padding:13px 28px;border-radius:12px;background:var(--sur);color:#e2e8f0;font-size:15px;font-weight:500;text-decoration:none;border:1px solid var(--bdr);transition:all .3s}
.btn-g:hover{background:rgba(255,255,255,.08)}

/* code demo */
.demo{max-width:640px;margin:0 auto}
.demo-bar{background:#1a1a2e;border-radius:12px 12px 0 0;padding:10px 16px;display:flex;align-items:center;gap:6px;border:1px solid var(--bdr);border-bottom:none}
.dc{width:10px;height:10px;border-radius:50%}
.dr{background:#ff5f57}.dy{background:#febc2e}.dg{background:#28c840}
.dt{font-size:12px;color:#4b5563;margin-left:8px;font-family:monospace}
.demo-body{background:#0a0a18;border:1px solid var(--bdr);border-radius:0 0 12px 12px;padding:22px 24px;overflow-x:auto}
pre{font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:13px;line-height:1.9;color:#cbd5e1}
.kw{color:#c084fc}.fn{color:#67e8f9}.str{color:#86efac}.cm{color:#374151;font-style:italic}

/* stats */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--bdr);border-radius:16px;overflow:hidden;margin:64px 0 0}
.stat{background:#07071a;padding:28px 16px;text-align:center}
.sv{font-size:32px;font-weight:800;letter-spacing:-1px;background:linear-gradient(135deg,var(--v),var(--c));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.sl{font-size:12px;color:#374151;margin-top:4px}

/* sections */
section{padding:80px 0}
.stag{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#a78bfa;font-weight:700;margin-bottom:12px}
h2{font-size:clamp(24px,4vw,40px);font-weight:800;letter-spacing:-.8px;margin-bottom:12px}
.s-sub{color:#4b5563;font-size:15px;line-height:1.75;max-width:440px}

/* features grid */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:52px}
.feat{background:var(--sur);border:1px solid var(--bdr);border-radius:16px;padding:26px;transition:all .3s}
.feat:hover{background:rgba(255,255,255,.06);border-color:rgba(139,92,246,.3);transform:translateY(-3px);box-shadow:0 16px 48px rgba(139,92,246,.08)}
.fi{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:19px;margin-bottom:16px}
.feat h3{font-size:15px;font-weight:700;margin-bottom:8px}
.feat p{font-size:13px;color:#4b5563;line-height:1.65}
.i1{background:linear-gradient(135deg,rgba(139,92,246,.18),rgba(139,92,246,.04))}
.i2{background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(34,211,238,.04))}
.i3{background:linear-gradient(135deg,rgba(217,70,239,.18),rgba(217,70,239,.04))}
.i4{background:linear-gradient(135deg,rgba(16,185,129,.18),rgba(16,185,129,.04))}
.i5{background:linear-gradient(135deg,rgba(245,158,11,.18),rgba(245,158,11,.04))}
.i6{background:linear-gradient(135deg,rgba(239,68,68,.18),rgba(239,68,68,.04))}

/* how it works */
.steps{display:flex;gap:0;margin-top:48px;flex-wrap:wrap}
.step{flex:1;min-width:160px;padding:26px 22px;background:var(--sur);border:1px solid var(--bdr);position:relative}
.step:first-child{border-radius:14px 0 0 14px}
.step:last-child{border-radius:0 14px 14px 0}
.step:not(:last-child)::after{content:'→';position:absolute;right:-13px;top:50%;transform:translateY(-50%);color:#374151;font-size:16px;z-index:1}
.sn{font-size:11px;font-family:monospace;color:#6366f1;margin-bottom:8px;font-weight:700}
.step h4{font-size:14px;font-weight:700;margin-bottom:6px}
.step p{font-size:12px;color:#4b5563;line-height:1.6}

/* quickstart */
.qs{background:var(--sur);border:1px solid var(--bdr);border-radius:16px;padding:28px 32px;margin-top:48px}
.qs h3{font-size:16px;font-weight:700;margin-bottom:20px;color:#e2e8f0}
.qs-step{display:flex;gap:14px;margin-bottom:18px;align-items:flex-start}
.qs-num{width:24px;height:24px;border-radius:50%;background:rgba(139,92,246,.2);border:1px solid rgba(139,92,246,.3);color:#a78bfa;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.qs-body p{font-size:13px;color:#94a3b8;margin-bottom:6px}
.qs-body code{display:block;background:#0a0a18;border:1px solid var(--bdr);border-radius:8px;padding:10px 14px;font-family:'SF Mono',Consolas,monospace;font-size:12px;color:#86efac;margin-top:6px;overflow-x:auto}

/* cta */
.cta{text-align:center;padding:80px 0}
.cta-box{background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(34,211,238,.04));border:1px solid rgba(139,92,246,.18);border-radius:22px;padding:60px 40px}

/* footer */
footer{border-top:1px solid var(--bdr);padding:24px 0}
.foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.fc{font-size:12px;color:#1f2937}
.fl{display:flex;gap:16px}
.fl a{font-size:12px;color:#374151;text-decoration:none;transition:color .2s}
.fl a:hover{color:#a78bfa}

@media(max-width:640px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .step:first-child{border-radius:14px 14px 0 0}.step:last-child{border-radius:0 0 14px 14px}
  .step:not(:last-child)::after{content:'↓';right:50%;bottom:-13px;top:auto;transform:translateX(50%)}
  .steps{flex-direction:column}
  .cta-box{padding:36px 20px}
  .nav-links .gh-label{display:none}
}
</style>
</head>
<body>
<div class="orbs"><div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div></div>

<nav><div class="wrap nav-i">
  <a class="logo" href="/"><div class="logo-ic">🔥</div>PageFire</a>
  <div class="nav-links">
    <a href="#features">功能</a>
    <a href="#quickstart">接入</a>
    <a href="https://github.com/bradyliuY/page-fire" class="gh">GitHub ↗</a>
  </div>
</div></nav>

<main>
<section class="hero wrap">
  <div class="hero-tag"><div class="dot"></div>MCP 驱动 · 自托管 · 开源</div>
  <h1><span class="grad">让 AI 直接发布<br>静态网页</span></h1>
  <p class="sub">通过 MCP 协议，AI 把 HTML / ZIP 发布成公网 HTTPS 页面，不超过 3 秒。自托管、多租户，无需任何部署流水线。</p>
  <div class="btns">
    <a class="btn-p" href="https://github.com/bradyliuY/page-fire">GitHub 查看源码 →</a>
    <a class="btn-g" href="#quickstart">5 分钟接入</a>
  </div>

  <div class="demo">
    <div class="demo-bar">
      <div class="dc dr"></div><div class="dc dy"></div><div class="dc dg"></div>
      <span class="dt">Claude Desktop — MCP 工具调用</span>
    </div>
    <div class="demo-body"><pre><span class="cm">// 你对 AI 说：</span>
<span class="str">"把这份产品介绍发布成公网网页"</span>

<span class="cm">// PageFire MCP 自动执行：</span>
<span class="kw">tools</span>/<span class="fn">deploy_page</span>({
  <span class="kw">html</span>: <span class="str">"&lt;h1&gt;我的产品&lt;/h1&gt;..."</span>,
  <span class="kw">pin</span>: <span class="kw">true</span>
})

<span class="cm">// 2 秒后返回公网地址：</span>
{ <span class="kw">url</span>: <span class="str">"https://f4vyog-3ixketu6.${baseDomain}/"</span> }</pre></div>
  </div>

  <div class="stats">
    <div class="stat"><div class="sv">&lt;3s</div><div class="sl">从调用到上线</div></div>
    <div class="stat"><div class="sv">8</div><div class="sl">MCP 工具</div></div>
    <div class="stat"><div class="sv">0</div><div class="sl">额外部署步骤</div></div>
    <div class="stat"><div class="sv">SPA</div><div class="sl">客户端路由支持</div></div>
  </div>
</section>

<section id="features"><div class="wrap">
  <div class="stag">核心能力</div>
  <h2>为 AI 工作流设计的发布层</h2>
  <p class="s-sub">不是传统部署工具，而是让 AI 直接控制发布的基础设施。</p>
  <div class="grid">
    <div class="feat"><div class="fi i1">⚡</div><h3>deploy_page — 单页发布</h3><p>传入 HTML 字符串，秒内获得独立 HTTPS 子域名。最适合 AI 生成的报告、演示、落地页。</p></div>
    <div class="feat"><div class="fi i2">📦</div><h3>deploy_zip — 完整站点</h3><p>上传 ZIP 包，自动解压发布。支持 React / Vue / Svelte 打包产物，开 SPA 模式客户端路由不会 404。</p></div>
    <div class="feat"><div class="fi i3">🗂️</div><h3>deploy_files — 多文件</h3><p>逐文件上传，支持子目录。适合文档站、多页 HTML 站，页面间相对路径跳转天然正确。</p></div>
    <div class="feat"><div class="fi i4">🔒</div><h3>密码保护访问</h3><p>set_access 一键切换公开 / 密码模式，内部报告只给指定受众，无需重新发布。</p></div>
    <div class="feat"><div class="fi i5">📌</div><h3>TTL + Pin 生命周期</h3><p>默认 7 天自动过期，pin 后永久保留。GC 命令批量清理，存储零积累。</p></div>
    <div class="feat"><div class="fi i6">🏠</div><h3>真正自托管</h3><p>单 Node 进程，SQLite WAL，复用现有 nginx。内存 &lt;150MB，与其它服务共存无摩擦。</p></div>
  </div>
</div></section>

<section style="padding-top:0"><div class="wrap">
  <div class="stag">工作流程</div>
  <h2>三步，零配置</h2>
  <div class="steps">
    <div class="step"><div class="sn">01 / 配置</div><h4>加入 MCP 服务器</h4><p>在 <code>.mcp.json</code> 填入服务地址和 Bearer token，一次配置永久生效。</p></div>
    <div class="step"><div class="sn">02 / 对话</div><h4>告诉 AI 发布什么</h4><p>用自然语言描述，AI 自动调用 deploy_page / deploy_zip 工具。</p></div>
    <div class="step"><div class="sn">03 / 访问</div><h4>获得公网 URL</h4><p>HTTPS 子域名即时可用，无需登录，直接分享给任何人。</p></div>
  </div>
</div></section>

<section id="quickstart" style="padding-top:0"><div class="wrap">
  <div class="stag">快速接入</div>
  <h2>5 分钟接入</h2>
  <div class="qs">
    <h3>配置步骤</h3>
    <div class="qs-step">
      <div class="qs-num">1</div>
      <div class="qs-body">
        <p>向管理员申请 Bearer Token（<code>pf_</code> 开头）</p>
      </div>
    </div>
    <div class="qs-step">
      <div class="qs-num">2</div>
      <div class="qs-body">
        <p>在项目根目录创建 <code>.mcp.json</code>（加入 .gitignore，不要提交）</p>
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
    <div class="qs-step">
      <div class="qs-num">3</div>
      <div class="qs-body">
        <p>重新加载 MCP 插件，在 Claude / Cursor 中对话：</p>
        <code>帮我把这份产品介绍发布成网页，永久保留。</code>
      </div>
    </div>
  </div>
</div></section>

<section class="cta"><div class="wrap">
  <div class="cta-box">
    <h2><span class="grad">开始使用 PageFire</span></h2>
    <p style="color:#94a3b8;font-size:16px;margin:14px 0 36px;line-height:1.7">自托管部署，数据完全自主可控。从克隆仓库到第一个页面上线，不超过 15 分钟。</p>
    <div class="btns">
      <a class="btn-p" href="https://github.com/bradyliuY/page-fire">GitHub 查看源码 →</a>
      <a class="btn-g" href="#quickstart">查看接入文档</a>
    </div>
  </div>
</div></section>
</main>

<footer><div class="wrap foot">
  <div class="fc">© 2026 PageFire · Self-hosted MCP static publisher · MIT License</div>
  <div class="fl">
    <a href="https://github.com/bradyliuY/page-fire">GitHub</a>
    <a href="https://mcp.${baseDomain}/mcp">MCP Endpoint</a>
  </div>
</div></footer>
</body>
</html>`
}
