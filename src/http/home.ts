import { zh } from './i18n/zh.js'
import { en } from './i18n/en.js'

export function renderHome(baseDomain: string, requireInvite = false, lang: 'zh' | 'en' = 'zh'): string {
  const T = lang === 'en' ? en : zh

  // Strings injected into the inline <script> block for JS-driven UI
  const _t = JSON.stringify({
    btnCreate: T.modal.btnCreate,
    btnLogin: T.modal.btnLogin,
    waiting: T.modal.waiting,
    errorDefault: T.modal.errorDefault,
    errorNetwork: T.modal.errorNetwork,
    btnCopy: T.modal.btnCopy,
    btnCopied: T.modal.btnCopied,
    spaceLabel: T.modal.spaceLabel,
    say: T.scenes.say,
    run: T.scenes.run,
    ret: T.scenes.ret,
    s: T.scenes.s,
    mdTitle: T.scenes.mdTitle,
  })

  const [sl0, sl1, sl2, sl3] = T.statLabels
  const canonicalUrl = `https://${baseDomain}${lang === 'en' ? '/en' : '/'}`
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PageFire',
    url: `https://${baseDomain}/`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: T.meta.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'deploy_page', 'deploy_zip', 'deploy_markdown', 'deploy_docs',
      'deploy_files', 'deploy_dir', 'pin_deployment', 'set_access',
      'list_deployments', 'get_deployment', 'delete_deployment',
    ],
    provider: { '@type': 'Organization', name: 'PageFire', url: `https://${baseDomain}/` },
    inLanguage: [T.htmlLang],
  })

  return `<!doctype html>
<html lang="${T.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<meta name="description" content="${T.meta.description}">
<meta name="keywords" content="${T.meta.keywords}">
<title>${T.meta.title}</title>
<link rel="canonical" href="${canonicalUrl}">
<link rel="alternate" hreflang="zh" href="https://${baseDomain}/">
<link rel="alternate" hreflang="en" href="https://${baseDomain}/en">
<link rel="alternate" hreflang="x-default" href="https://${baseDomain}/">
<link rel="icon" type="image/png" href="/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PageFire">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:title" content="${T.meta.ogTitle}">
<meta property="og:description" content="${T.meta.ogDescription}">
<meta property="og:image" content="https://${baseDomain}/logo.png">
<meta property="og:image:alt" content="PageFire logo">
<meta property="og:locale" content="${T.meta.ogLocale}">
<meta property="og:locale:alternate" content="${T.meta.ogLocaleAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${T.meta.ogTitle}">
<meta name="twitter:description" content="${T.meta.ogDescription}">
<meta name="twitter:image" content="https://${baseDomain}/logo.png">
<script type="application/ld+json">${jsonLd}</script>
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
.nav-lang{border:1px solid var(--bdr);font-size:12px !important;padding:5px 10px !important}
.nav-gh{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;color:var(--muted);transition:.15s;padding:0 !important}
.nav-gh:hover{color:var(--txt) !important;background:var(--sur) !important}

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
  <a class="logo" href="/"><img src="/logo.png" alt="PageFire" style="height:34px;width:auto;display:block"></a>
  <div class="nav-r">
    <a href="#features">${T.nav.features}</a>
    <a href="#examples">${T.nav.examples}</a>
    <a href="/playground">Playground</a>
    <a href="#quickstart">${T.nav.quickstart}</a>
    <a href="https://github.com/bradyliuY/page-fire" target="_blank" rel="noopener" class="nav-gh" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg></a>
    <a href="${T.nav.switchLangHref}" class="nav-lang">${T.nav.switchLang}</a>
    <span id="nav-auth">
      <a onclick="showAuth('login')" class="nav-login">${T.nav.login}</a>
      <a onclick="showAuth('register')" class="nav-reg">${T.nav.register}</a>
    </span>
    <span id="nav-user" style="display:none;align-items:center;gap:6px">
      <a href="/dashboard" class="nav-reg">${T.nav.dashboard}</a>
    </span>
  </div>
</div></nav>

<main>
<div class="sec hero w">
  <div class="badge"><span class="ping"></span>${T.hero.badge}</div>
  <h1>${T.hero.h1}</h1>
  <p class="hero-sub">${T.hero.sub}</p>
  <div class="btns">
    <a class="bp" onclick="showAuth('register')">${T.hero.btnStart}</a>
    <a class="bg" href="/playground">${T.hero.btnPlayground}</a>
  </div>

  <div class="term">
    <div class="t-bar">
      <div class="d dr"></div><div class="d dy"></div><div class="d dg"></div>
      <div class="t-tabs">
        <button class="t-tab active" data-i="0" onclick="pickScene(0)">${T.hero.sceneTabs[0]}</button>
        <button class="t-tab" data-i="1" onclick="pickScene(1)">${T.hero.sceneTabs[1]}</button>
        <button class="t-tab" data-i="2" onclick="pickScene(2)">${T.hero.sceneTabs[2]}</button>
      </div>
    </div>
    <div class="t-body"><pre id="scene"></pre></div>
  </div>

  <div class="stats">
    <div class="stat"><div class="sv"><span class="u">&lt;</span>3s</div><div class="sl">${sl0}</div></div>
    <div class="stat"><div class="sv">11</div><div class="sl">${sl1}</div></div>
    <div class="stat"><div class="sv">0</div><div class="sl">${sl2}</div></div>
    <div class="stat"><div class="sv">SPA</div><div class="sl">${sl3}</div></div>
  </div>
</div>

<div class="sec" id="features"><div class="w">
  <div class="stag">${T.features.tag}</div>
  <h2>${T.features.h2}</h2>
  <p class="ssub">${T.features.sub}</p>
  <div class="grid">
    ${T.features.items.map(f => `<div class="feat">
      <div class="fi">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>`).join('')}
  </div>
</div></div>

<div class="sec" id="examples" style="padding-top:0"><div class="w">
  <div class="stag">${T.examples.tag}</div>
  <h2>${T.examples.h2}</h2>
  <p class="ssub">${T.examples.sub}</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
    <a class="feat" href="https://demosite-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">${T.examples.items[0].icon}</div>
      <h3>${T.examples.items[0].title} <span style="color:var(--dim);font-weight:400">${T.examples.items[0].tool}</span></h3>
      <p>${T.examples.items[0].desc}<span style="color:var(--fire2)">${T.examples.items[0].link}</span></p>
    </a>
    <a class="feat" href="https://demoarticle-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">${T.examples.items[1].icon}</div>
      <h3>${T.examples.items[1].title} <span style="color:var(--dim);font-weight:400">${T.examples.items[1].tool}</span></h3>
      <p>${T.examples.items[1].desc}<span style="color:var(--fire2)">${T.examples.items[1].link}</span></p>
    </a>
    <a class="feat" href="https://demodocs-ylfupykx.${baseDomain}/" target="_blank" rel="noopener" style="display:block">
      <div class="fi">${T.examples.items[2].icon}</div>
      <h3>${T.examples.items[2].title} <span style="color:var(--dim);font-weight:400">${T.examples.items[2].tool}</span></h3>
      <p>${T.examples.items[2].desc}<span style="color:var(--fire2)">${T.examples.items[2].link}</span></p>
    </a>
  </div>
</div></div>

<div class="sec" style="padding-top:0"><div class="w">
  <div class="stag">${T.steps.tag}</div>
  <h2>${T.steps.h2}</h2>
  <div class="steps">
    ${T.steps.items.map(s => `<div class="step">
      <div class="sn">${s.num}</div>
      <h4>${s.h4}</h4>
      <p>${s.p}</p>
    </div>`).join('')}
  </div>
</div></div>

<div class="sec" id="quickstart" style="padding-top:0"><div class="w">
  <div class="stag">${T.qs.tag}</div>
  <h2>${T.qs.h2}</h2>
  <div class="qs">
    <div class="qs-item">
      <div class="qn">1</div>
      <div class="qb">
        <p><a onclick="showAuth('register')" style="cursor:pointer">${T.qs.step1link}</a>${T.qs.step1rest}</p>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn">2</div>
      <div class="qb">
        <p>${T.qs.step2p}</p>
        <div class="ctabs">
          <button class="ctab on" onclick="qpick('claude')">Claude Desktop / Code</button>
          <button class="ctab" onclick="qpick('cursor')">Cursor</button>
          <button class="ctab" onclick="qpick('codex')">OpenAI Codex</button>
          <button class="ctab" onclick="qpick('other')">${T.qs.tabOther}</button>
        </div>
        <div class="cpane on" id="qp-claude">
          <p><b>${T.qs.claude.m1title}</b><br>${T.qs.claude.m1desc}</p>
          <code>{
  "mcpServers": {
    "pagefire": {
      "type": "http",
      "url": "https://mcp.${baseDomain}/mcp",
      "headers": { "Authorization": "Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;" }
    }
  }
}</code>
          <div class="note">${T.qs.claude.cliNote} <span class="inline-c">claude mcp add --transport http pagefire https://mcp.${baseDomain}/mcp -H "Authorization: Bearer &lt;token&gt;"</span></div>
          <p style="margin-top:16px"><b>${T.qs.claude.m2title}</b><br>${T.qs.claude.m2desc}</p>
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
      "env": { "AUTH_HEADER": "Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;" }
    }
  }
}</code>
          <div class="note">${T.qs.claude.m2note}</div>
          <p style="margin-top:16px"><b>${T.qs.claude.m3title}</b><br>${T.qs.claude.m3desc}</p>
          <code>{
  "mcpServers": {
    "pagefire": {
      "command": "npx",
      "args": ["-y", "pagefire-mcp@latest"],
      "env": { "PAGEFIRE_TOKEN": "pf_&lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;" }
    }
  }
}</code>
        </div>
        <div class="cpane" id="qp-cursor">
          <p>${T.qs.cursor.p}</p>
          <code>{
  "pagefire": {
    "url": "https://mcp.${baseDomain}/mcp",
    "headers": { "Authorization": "Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;" }
  }
}</code>
          <div class="note">${T.qs.cursor.note}</div>
        </div>
        <div class="cpane" id="qp-codex">
          <p>${T.qs.codex.p}</p>
          <code>mcp_servers:
  - name: pagefire
    type: http
    url: https://mcp.${baseDomain}/mcp
    headers:
      Authorization: "Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;"</code>
          <div class="note">${T.qs.codex.note}</div>
        </div>
        <div class="cpane" id="qp-other">
          <p>${T.qs.other.p}</p>
          <code>${lang === 'en' ? 'Endpoint' : '端点'}：https://mcp.${baseDomain}/mcp
${lang === 'en' ? 'Auth' : '鉴权'}：Authorization: Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;
${lang === 'en' ? 'Protocol' : '协议'}：MCP 2025-03-26 (Streamable HTTP)</code>
          <div class="note">${T.qs.other.note}</div>
        </div>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn">3</div>
      <div class="qb">
        <p>${T.qs.step3p}</p>
        <div class="ctabs" id="dp-tabs">
          <button class="dtab on" onclick="dpick('claude')">Claude Desktop / Code</button>
          <button class="dtab" onclick="dpick('cursor')">Cursor</button>
          <button class="dtab" onclick="dpick('codex')">OpenAI Codex</button>
          <button class="dtab" onclick="dpick('other')">${T.qs.tabOther}</button>
        </div>
        <div class="dpane on" id="dp-claude">
          <code>${T.qs.deploy.claude.cmd}</code>
          <div class="note">${T.qs.deploy.claude.note}</div>
        </div>
        <div class="dpane" id="dp-cursor">
          <code>${T.qs.deploy.cursor.cmd}</code>
          <div class="note">${T.qs.deploy.cursor.note}</div>
        </div>
        <div class="dpane" id="dp-codex">
          <code>${T.qs.deploy.codex.cmd}</code>
          <div class="note">${T.qs.deploy.codex.note}</div>
        </div>
        <div class="dpane" id="dp-other">
          <code>${T.qs.deploy.other.cmd}</code>
          <div class="note">${T.qs.deploy.other.note}</div>
        </div>
      </div>
    </div>
    <div class="qs-item">
      <div class="qn" style="background:none;border:1px solid var(--bdr);color:var(--dim);font-size:16px">→</div>
      <div class="qb">
        <p style="margin-bottom:6px"><b>${T.qs.step4label}</b></p>
        <code>npm install -g pagefire-mcp
export PAGEFIRE_TOKEN=pf_${lang === 'en' ? 'your-token' : '你的token'}

pagefire deploy ./dist --pin        # ${lang === 'en' ? 'deploy directory' : '发布目录'}
pagefire deploy README.md           # ${lang === 'en' ? 'deploy Markdown' : '发布 Markdown'}
pagefire deploy-docs ./docs         # ${lang === 'en' ? 'deploy docs site' : '发布文档站'}
pagefire list                       # ${lang === 'en' ? 'list all deployments' : '查看所有部署'}</code>
        <div class="note" style="margin-top:8px">${T.qs.step4note}</div>
      </div>
    </div>
  </div>
</div></div>

<div class="sec"><div class="w">
  <div class="cta-box">
    <h2>${T.cta.h2}</h2>
    <p style="color:var(--muted);font-size:15px;margin:14px auto 34px;line-height:1.7;max-width:440px">${T.cta.sub}</p>
    <div class="btns">
      <a class="bp" onclick="showAuth('register')">${T.cta.btnStart}</a>
      <a class="bg" href="/playground">${T.cta.btnPlayground}</a>
    </div>
  </div>
</div></div>
</main>

<footer><div class="w fi-row">
  <div class="fc">${T.footer.copyright}</div>
  <div class="fl">
    <a href="/playground">Playground</a>
    <a href="#quickstart">${T.footer.quickstart}</a>
    <a href="https://mcp.${baseDomain}/mcp">${T.footer.mcp}</a>
    <a href="https://github.com/bradyliuY/page-fire" target="_blank" rel="noopener">GitHub</a>
  </div>
</div></footer>

<!-- Auth Modal -->
<div id="modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.6);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)closeAuth()">
<div style="background:#121214;border:1px solid var(--bdr2);border-radius:16px;padding:30px 28px;width:100%;max-width:400px;position:relative">
  <button onclick="closeAuth()" style="position:absolute;top:14px;right:17px;background:none;border:none;color:var(--dim);font-size:22px;cursor:pointer;line-height:1">×</button>

  <div style="display:flex;gap:0;margin-bottom:26px;border-bottom:1px solid var(--bdr)">
    <button id="tab-register" onclick="switchTab('register')" style="flex:1;background:none;border:none;padding:11px 0;font-size:14px;font-weight:600;cursor:pointer;color:var(--fire);border-bottom:2px solid var(--fire);transition:.15s">${T.modal.tabRegister}</button>
    <button id="tab-login" onclick="switchTab('login')" style="flex:1;background:none;border:none;padding:11px 0;font-size:14px;font-weight:500;cursor:pointer;color:var(--dim);border-bottom:2px solid transparent;transition:.15s">${T.modal.tabLogin}</button>
  </div>

  <form id="auth-form" onsubmit="submitAuth(event)">
    <div style="margin-bottom:14px">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">${T.modal.labelUsername}</label>
      <input id="f-username" autocomplete="username" placeholder="${T.modal.placeholderUsername}"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">${T.modal.labelPassword}</label>
      <input id="f-password" type="password" autocomplete="current-password" placeholder="${T.modal.placeholderPassword}"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div id="invite-wrap" style="margin-bottom:20px;display:none">
      <label style="font-size:12.5px;color:var(--muted);display:block;margin-bottom:6px">${T.modal.labelInvite}${requireInvite ? ' <span style="color:#f87171">*</span>' : ` <span style="color:var(--dim)">${T.modal.inviteOptional}</span>`}</label>
      <input id="f-invite" placeholder="${T.modal.labelInvite}"
        style="width:100%;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:14px;outline:none;transition:.15s"
        onfocus="this.style.borderColor='rgba(249,115,22,.5)'" onblur="this.style.borderColor='var(--bdr)'">
    </div>
    <div id="auth-err" style="display:none;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);border-radius:8px;padding:9px 12px;font-size:13px;color:#fca5a5;margin-bottom:14px"></div>
    <button id="auth-btn" type="submit"
      style="width:100%;padding:12px;border-radius:10px;background:#fafafa;color:#0a0a0b;font-size:14px;font-weight:600;border:none;cursor:pointer;transition:.18s">
      ${T.modal.btnCreate}
    </button>
  </form>

  <!-- token result (shown after register success) -->
  <div id="auth-ok" style="display:none;text-align:center">
    <div style="width:46px;height:46px;border-radius:12px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:22px;margin:0 auto 14px">🔑</div>
    <div style="font-size:16px;font-weight:660;margin-bottom:4px;color:#fafafa">${T.modal.successTitle}</div>
    <div style="font-size:13px;color:var(--dim);margin-bottom:16px">${T.modal.successSub}</div>
    <div style="position:relative">
      <code id="ok-token" style="display:block;background:#0a0a0b;border:1px solid var(--bdr);border-radius:9px;padding:12px 46px 12px 14px;font-size:12px;color:var(--fire2);word-break:break-all;text-align:left;line-height:1.6"></code>
      <button onclick="copyToken()" title="${T.modal.btnCopy}"
        style="position:absolute;right:9px;top:9px;background:var(--sur2);border:1px solid var(--bdr);border-radius:7px;padding:5px 9px;color:var(--muted);cursor:pointer;font-size:12px">${T.modal.btnCopy}</button>
    </div>
    <div id="ok-space" style="font-size:12px;color:var(--dim);margin:10px 0 18px"></div>
    <a href="/dashboard" style="display:block;width:100%;padding:11px;border-radius:10px;background:#fafafa;color:#0a0a0b;font-size:14px;font-weight:600">${T.modal.btnDashboard}</a>
  </div>
</div></div>

<script>
const _t = ${_t}

// ── Interactive hero demo: switchable / auto-rotating scenarios ───────────────
const C = (cls, t) => '<span class="' + cls + '">' + t + '</span>'
const SCENES = [
  C('cm',_t.say) + '\\n' +
  C('str',_t.s[0]) + '\\n\\n' +
  C('cm',_t.run) + '\\n' +
  C('fn','deploy_page') + '({ html: ' + C('str','"&lt;h1&gt;...&lt;/h1&gt;"') + ', pin: ' + C('kw','true') + ' })\\n\\n' +
  C('cm',_t.ret[0]) + '\\n' +
  '{ url: ' + C('str','"https://f4vyog-3ixketu6.${baseDomain}/"') + ' }',

  C('cm',_t.say) + '\\n' +
  C('str',_t.s[1]) + '\\n\\n' +
  C('cm',_t.run) + '\\n' +
  C('fn','deploy_markdown') + '({ markdown: ' + C('str',_t.mdTitle) + ', theme: ' + C('str','"dark"') + ' })\\n\\n' +
  C('cm',_t.ret[1]) + '\\n' +
  '{ url: ' + C('str','"https://ragdemo-bmwvx12a.${baseDomain}/"') + ' }',

  C('cm',_t.say) + '\\n' +
  C('str',_t.s[2]) + '\\n\\n' +
  C('cm',_t.run) + '\\n' +
  C('fn','deploy_docs') + '({ files: [' + C('str','"index.md"') + ', ' + C('str','"guide.md"') + ', ...] })\\n\\n' +
  C('cm',_t.ret[2]) + '\\n' +
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
  document.getElementById('auth-btn').textContent = isReg ? _t.btnCreate : _t.btnLogin
  document.getElementById('invite-wrap').style.display = isReg ? '' : 'none'
  document.getElementById('auth-err').style.display = 'none'
}
async function submitAuth(e) {
  e.preventDefault()
  const btn = document.getElementById('auth-btn')
  const errEl = document.getElementById('auth-err')
  errEl.style.display = 'none'
  btn.disabled = true; btn.textContent = _t.waiting
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
    if (!r.ok) { errEl.textContent = d.error || _t.errorDefault; errEl.style.display = '' }
    else if (curTab === 'login') {
      location.href = '/dashboard'
    } else {
      document.getElementById('auth-form').style.display = 'none'
      document.getElementById('auth-ok').style.display = ''
      document.getElementById('ok-token').textContent = d.token || ''
      document.getElementById('ok-space').textContent = d.space_id ? _t.spaceLabel + d.space_id + '.${baseDomain}' : ''
    }
  } catch { errEl.textContent = _t.errorNetwork; errEl.style.display = '' }
  btn.disabled = false; btn.textContent = curTab === 'register' ? _t.btnCreate : _t.btnLogin
}
function copyToken() {
  const t = document.getElementById('ok-token').textContent
  navigator.clipboard.writeText(t).then(() => {
    const b = event.target; b.textContent = _t.btnCopied; setTimeout(() => b.textContent = _t.btnCopy, 1500)
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
