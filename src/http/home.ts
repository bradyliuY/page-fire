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
:root{
  --purple:#8b5cf6;--pink:#d946ef;--cyan:#22d3ee;--green:#4ade80;
  --bg:#030308;--bg2:#08081a;--sur:rgba(255,255,255,.04);--bdr:rgba(255,255,255,.07);
  --txt:#e2e8f0;--muted:#94a3b8;--dim:#64748b
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;min-height:100vh;overflow-x:hidden;line-height:1.6}

/* ambient orbs */
.orbs{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.orb{position:absolute;border-radius:50%;filter:blur(140px);animation:drift 24s ease-in-out infinite}
.o1{width:800px;height:800px;background:rgba(109,40,217,.18);top:-300px;left:-200px}
.o2{width:600px;height:600px;background:rgba(6,182,212,.12);bottom:-200px;right:-100px;animation-delay:-11s}
.o3{width:500px;height:500px;background:rgba(192,38,211,.1);top:35%;left:40%;animation-delay:-19s}
@keyframes drift{0%,100%{transform:translate(0,0)}35%{transform:translate(40px,-30px)}70%{transform:translate(-25px,35px)}}

.w{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:0 24px}

/* nav */
nav{position:sticky;top:0;z-index:100;border-bottom:1px solid var(--bdr);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);background:rgba(3,3,8,.7)}
.nav-i{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:700;text-decoration:none;color:#fff;letter-spacing:-.3px}
.logo-box{width:30px;height:30px;background:linear-gradient(135deg,var(--purple),var(--pink));border-radius:7px;display:grid;place-items:center;font-size:14px;flex-shrink:0}
.nav-r{display:flex;align-items:center;gap:4px}
.nav-r a{color:var(--muted);text-decoration:none;font-size:13.5px;padding:6px 11px;border-radius:7px;transition:.15s}
.nav-r a:hover{color:var(--txt);background:rgba(255,255,255,.06)}
.nav-gh{border:1px solid var(--bdr) !important;color:var(--txt) !important}

/* hero */
.hero{padding:96px 0 72px;text-align:center}
.badge{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 10px;border-radius:20px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);font-size:12.5px;color:#c4b5fd;margin-bottom:32px;letter-spacing:.01em}
.ping{width:8px;height:8px;border-radius:50%;background:var(--purple);box-shadow:0 0 10px var(--purple);animation:pulse 2.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
h1{font-size:clamp(36px,6.5vw,70px);font-weight:800;line-height:1.06;letter-spacing:-2px;margin-bottom:22px}
.g{background:linear-gradient(130deg,#fff 0%,#c4b5fd 40%,#67e8f9 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero-sub{font-size:clamp(14px,2vw,17px);color:var(--muted);max-width:480px;margin:0 auto 40px;line-height:1.8}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:56px}
.bp{padding:12px 26px;border-radius:10px;background:linear-gradient(135deg,var(--purple),var(--pink));color:#fff;font-size:14.5px;font-weight:600;text-decoration:none;box-shadow:0 0 40px rgba(139,92,246,.35);transition:.25s;white-space:nowrap}
.bp:hover{box-shadow:0 0 60px rgba(139,92,246,.55);transform:translateY(-2px)}
.bg{padding:12px 26px;border-radius:10px;border:1px solid var(--bdr);color:var(--txt);font-size:14.5px;font-weight:500;text-decoration:none;background:var(--sur);transition:.25s;white-space:nowrap}
.bg:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12)}

/* code terminal */
.term{max-width:620px;margin:0 auto;border-radius:14px;overflow:hidden;border:1px solid var(--bdr);box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04)}
.t-bar{background:#111125;padding:11px 16px;display:flex;align-items:center;gap:7px;border-bottom:1px solid var(--bdr)}
.d{width:11px;height:11px;border-radius:50%}
.dr{background:#ff5f57}.dy{background:#febc2e}.dg{background:#28c840}
.t-title{font-size:12px;color:var(--dim);margin-left:6px;font-family:monospace}
.t-body{background:#07071a;padding:24px 26px;overflow-x:auto}
pre{font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:12.5px;line-height:2;color:#cbd5e1;white-space:pre}
.kw{color:#c084fc}.fn{color:#67e8f9}.str{color:#86efac}.cm{color:#374151}.num{color:#fb923c}

/* stats bar */
.stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:56px;border-radius:14px;border:1px solid var(--bdr);overflow:hidden}
.stat{background:var(--bg2);padding:24px 12px;text-align:center;border-right:1px solid var(--bdr)}
.stat:last-child{border-right:none}
.sv{font-size:28px;font-weight:800;letter-spacing:-1px;background:linear-gradient(130deg,var(--purple),var(--cyan));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1}
.sl{font-size:12px;color:var(--dim);margin-top:6px}

/* sections */
.sec{padding:80px 0}
.stag{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#a78bfa;font-weight:700;margin-bottom:14px}
h2{font-size:clamp(22px,3.5vw,36px);font-weight:800;letter-spacing:-.6px;margin-bottom:10px;color:#f1f5f9}
.ssub{color:var(--muted);font-size:15px;line-height:1.75;max-width:420px}

/* feature grid */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1px;background:var(--bdr);border-radius:16px;overflow:hidden;margin-top:48px}
.feat{background:var(--bg2);padding:28px;transition:.2s}
.feat:hover{background:rgba(255,255,255,.035)}
.fi{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-size:18px;margin-bottom:18px;flex-shrink:0}
.feat h3{font-size:14.5px;font-weight:700;margin-bottom:8px;color:#f1f5f9}
.feat p{font-size:13px;color:var(--muted);line-height:1.7}
.feat code{font-family:'SF Mono',Consolas,monospace;font-size:12px;color:#c4b5fd;background:rgba(139,92,246,.12);padding:1px 6px;border-radius:4px}
.i1{background:rgba(139,92,246,.15)}.i2{background:rgba(34,211,238,.12)}.i3{background:rgba(217,70,239,.12)}.i4{background:rgba(74,222,128,.1)}.i5{background:rgba(251,146,60,.1)}.i6{background:rgba(239,68,68,.1)}

/* how it works */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--bdr);border-radius:14px;overflow:hidden;margin-top:44px}
.step{background:var(--bg2);padding:28px 24px}
.sn{font-size:11px;font-family:monospace;color:var(--purple);margin-bottom:10px;font-weight:700;letter-spacing:.06em}
.step h4{font-size:14.5px;font-weight:700;margin-bottom:8px;color:#f1f5f9}
.step p{font-size:13px;color:var(--muted);line-height:1.7}
.step code{font-size:12px;font-family:'SF Mono',Consolas,monospace;color:#86efac;background:rgba(74,222,128,.08);padding:1px 5px;border-radius:4px}

/* quickstart */
.qs{background:var(--bg2);border:1px solid var(--bdr);border-radius:16px;padding:32px 36px;margin-top:44px}
.qs-item{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--bdr)}
.qs-item:last-child{border-bottom:none;padding-bottom:0}
.qs-item:first-child{padding-top:0}
.qn{width:26px;height:26px;border-radius:50%;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.25);color:#a78bfa;font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0;margin-top:2px}
.qb p{font-size:13.5px;color:var(--muted);margin-bottom:8px}
.qb code{display:block;background:#07071a;border:1px solid var(--bdr);border-radius:8px;padding:12px 16px;font-family:'SF Mono',Consolas,monospace;font-size:12px;color:#86efac;overflow-x:auto;white-space:pre}
.inline-c{display:inline;font-size:12.5px;font-family:'SF Mono',Consolas,monospace;color:#c4b5fd;background:rgba(139,92,246,.12);padding:1px 6px;border-radius:4px}

/* cta */
.cta-box{border:1px solid rgba(139,92,246,.2);border-radius:20px;padding:64px 40px;text-align:center;background:linear-gradient(160deg,rgba(139,92,246,.06) 0%,rgba(34,211,238,.03) 100%)}

/* footer */
footer{border-top:1px solid var(--bdr);padding:22px 0}
.fi-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.fc{font-size:12px;color:var(--dim)}
.fl{display:flex;gap:16px}
.fl a{font-size:12px;color:var(--dim);text-decoration:none;transition:.15s}
.fl a:hover{color:#a78bfa}

@media(max-width:680px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .stat:nth-child(2){border-right:none}
  .stat:nth-child(1),.stat:nth-child(2){border-bottom:1px solid var(--bdr)}
  .steps{grid-template-columns:1fr}
  .grid{grid-template-columns:1fr}
  .cta-box{padding:40px 20px}
  .hero{padding:64px 0 52px}
}
</style>
</head>
<body>
<div class="orbs"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div></div>

<nav><div class="w nav-i">
  <a class="logo" href="/"><div class="logo-box">🔥</div>PageFire</a>
  <div class="nav-r">
    <a href="#features">功能</a>
    <a href="#quickstart">接入</a>
    <a href="https://github.com/bradyliuY/page-fire" class="nav-gh">GitHub ↗</a>
  </div>
</div></nav>

<main>
<div class="sec hero w">
  <div class="badge"><div class="ping"></div>MCP 驱动 · 自托管 · 开源</div>
  <h1><span class="g">让 AI 直接发布<br>静态网页</span></h1>
  <p class="hero-sub">通过 MCP 协议，AI 把 HTML / ZIP 发布成公网 HTTPS 页面，3 秒内完成。自托管、多租户，无需任何 CI/CD 流水线。</p>
  <div class="btns">
    <a class="bp" href="https://github.com/bradyliuY/page-fire">GitHub 查看源码 →</a>
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
    <div class="stat"><div class="sv">&lt;3s</div><div class="sl">从调用到上线</div></div>
    <div class="stat"><div class="sv">8</div><div class="sl">MCP 工具</div></div>
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
      <div class="fi i1">⚡</div>
      <h3><code>deploy_page</code> — 单页发布</h3>
      <p>传入 HTML 字符串，秒内获得独立 HTTPS 子域名。最适合 AI 生成的报告、演示、落地页。</p>
    </div>
    <div class="feat">
      <div class="fi i2">📦</div>
      <h3><code>deploy_zip</code> — 完整站点</h3>
      <p>上传 ZIP 包，自动解压发布。支持 React / Vue 打包产物，开启 SPA 模式客户端路由不会 404。</p>
    </div>
    <div class="feat">
      <div class="fi i3">🗂</div>
      <h3><code>deploy_files</code> — 多文件</h3>
      <p>逐文件上传，支持子目录结构。适合文档站、多页 HTML，页面间相对路径跳转天然正确。</p>
    </div>
    <div class="feat">
      <div class="fi i4">🔒</div>
      <h3>密码保护访问</h3>
      <p><code>set_access</code> 一键切换公开或密码模式，内部报告只给指定受众，无需重新发布内容。</p>
    </div>
    <div class="feat">
      <div class="fi i5">📌</div>
      <h3>TTL + Pin 生命周期</h3>
      <p>默认 7 天自动过期，<code>pin: true</code> 永久保留。GC 命令批量清理过期部署，存储零积累。</p>
    </div>
    <div class="feat">
      <div class="fi i6">🏠</div>
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
        <p>向管理员申请 Bearer Token（<span class="inline-c">pf_</span> 开头的密钥）</p>
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
    <h2><span class="g">开始使用 PageFire</span></h2>
    <p style="color:var(--muted);font-size:15.5px;margin:14px 0 36px;line-height:1.75;max-width:440px;margin-left:auto;margin-right:auto">自托管部署，数据完全自主可控。从克隆仓库到第一个页面上线，不超过 15 分钟。</p>
    <div class="btns">
      <a class="bp" href="https://github.com/bradyliuY/page-fire">GitHub 查看源码 →</a>
      <a class="bg" href="#quickstart">查看接入文档</a>
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
</body>
</html>`
}
