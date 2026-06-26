import { zh } from './i18n/zh.js'
import { en } from './i18n/en.js'

export function renderPlayground(baseDomain: string, lang: 'zh' | 'en' = 'zh'): string {
  const T = lang === 'en' ? en : zh
  const P = T.pg
  const _t = JSON.stringify(P._t)
  const toolRows = P.tools.map(t =>
    `<div class="tl-row"><div class="tl-name">${t.name}</div><div class="tl-body"><div class="tl-title">${t.title}</div><div class="tl-desc">${t.desc}</div><div class="params">${t.params.split(' ').map(p => `<code>${p}</code>`).join(' ')}</div></div></div>`
  ).join('')
  const toolOptions = P._t.toolOptions.map(o => `<option value="${o.v}">${o.l}</option>`).join('')
  return `<!doctype html>
<html lang="${P.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${P.meta.desc}">
<title>${P.meta.title}</title>
<link rel="icon" type="image/png" href="/favicon.ico">
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
.nav-i{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{display:flex;align-items:center;gap:9px;font-weight:650;font-size:15.5px}
.flame{width:26px;height:26px;border-radius:7px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);display:grid;place-items:center;font-size:13px}
.nav-r{display:flex;gap:6px;align-items:center}
.nav-r a{color:var(--muted);font-size:13.5px;padding:7px 12px;border-radius:8px;transition:.15s}
.nav-r a:hover{color:var(--txt);background:var(--sur)}
.nav-reg{background:#fafafa !important;color:#0a0a0b !important;font-weight:600}
.nav-reg:hover{background:#e4e4e7 !important}
.nav-lang{border:1px solid var(--bdr) !important;font-size:12.5px !important;padding:5px 10px !important}
.nav-lang:hover{border-color:var(--bdr2) !important}
.nav-gh{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;color:var(--muted);transition:.15s;padding:0 !important}
.nav-gh:hover{color:var(--txt) !important;background:var(--sur) !important}

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
.cs{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--bdr)}
.cb{flex:1;min-width:0;font-size:13px;color:var(--muted);line-height:1.7}
.cb b{color:var(--txt);display:block;margin-bottom:3px}
.cb a{color:var(--fire2)}
.cn{width:26px;height:26px;border-radius:8px;background:var(--fire-dim);border:1px solid rgba(249,115,22,.25);color:var(--fire2);font-size:12px;font-weight:700;display:grid;place-items:center;flex-shrink:0;margin-top:2px}
.conn-info{margin-top:18px;padding:14px 18px;border:1px solid var(--bdr);border-radius:11px;background:var(--bg2);display:flex;flex-direction:column;gap:8px}
.ci-row{display:flex;align-items:baseline;gap:10px;font-size:13px}
.ci-k{color:var(--muted);min-width:52px;flex-shrink:0}

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
/* tool list (replaces grid) */
.tool-list{border:1px solid var(--bdr);border-radius:13px;overflow:hidden}
.tl-row{display:flex;align-items:flex-start;gap:0;border-bottom:1px solid var(--bdr)}
.tl-row:last-child{border-bottom:none}
.tl-name{font-family:'SF Mono',ui-monospace,monospace;font-size:12.5px;color:var(--fire2);min-width:160px;padding:18px 16px 18px 20px;background:var(--bg2);border-right:1px solid var(--bdr);word-break:break-all}
.tl-body{padding:16px 20px;flex:1}
.tl-title{font-size:13.5px;font-weight:600;color:var(--txt);margin-bottom:5px}
.tl-desc{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:10px}
/* drag & drop zone */
.dropzone{border:1.5px dashed var(--bdr);border-radius:11px;padding:22px 16px;text-align:center;font-size:13px;color:var(--dim);cursor:pointer;transition:.2s;margin-bottom:14px;position:relative}
.dropzone.drag{border-color:var(--fire2);background:var(--fire-dim);color:var(--fire2)}
.dropzone input{position:absolute;inset:0;opacity:0;cursor:pointer}
/* connect platform list */
.sec-sm{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:14px}
.cli-list{border:1px solid var(--bdr);border-radius:12px;overflow:hidden}
.cli-row{display:flex;align-items:flex-start;border-bottom:1px solid var(--bdr)}
.cli-name{font-size:12.5px;font-weight:600;color:var(--txt);min-width:130px;padding:16px 14px 16px 18px;background:var(--bg2);border-right:1px solid var(--bdr);line-height:1.5;flex-shrink:0}
.cli-name span{font-weight:400;color:var(--muted)}
.cli-body{padding:14px 18px;font-size:13px;color:var(--muted);line-height:1.7;flex:1}
.cli-body b{color:var(--txt)}
.ic{font-family:'SF Mono',ui-monospace,monospace;font-size:11.5px;color:var(--fire2);background:rgba(249,115,22,.08);padding:1px 5px;border-radius:4px}
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
  <a class="logo" href="${P.nav.homeLangPrefix}/"><img src="/logo.png" alt="PageFire" style="height:34px;width:auto;display:block"></a>
  <div class="nav-r">
    <a href="${P.nav.homeLangPrefix}/#features">${P.nav.features}</a>
    <a href="${P.nav.homeLangPrefix}/#examples">${P.nav.examples}</a>
    <a href="${lang === 'en' ? '/en/playground' : '/playground'}">${P.nav.playground}</a>
    <a href="${P.nav.homeLangPrefix}/#quickstart">${P.nav.connect}</a>
    <a href="https://github.com/bradyliuY/page-fire" target="_blank" rel="noopener" class="nav-gh" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg></a>
    <a href="${P.nav.switchLangHref}" class="nav-lang">${P.nav.switchLang}</a>
    <a href="${lang === 'en' ? '/en/dashboard' : '/dashboard'}" class="nav-reg">${P.nav.dashboard}</a>
  </div>
</div></nav>

<div class="w">
  <div class="hd">
    <div class="tag"><span class="ping"></span>${P.hero.badge}</div>
    <h1>${P.hero.h1}</h1>
    <p class="sub">${P.hero.sub}</p>
  </div>

  <div class="tabs">
    <button class="tab active" data-p="intro" onclick="pick('intro')">${P.tabs.intro}</button>
    <button class="tab" data-p="tools" onclick="pick('tools')">${P.tabs.tools}</button>
    <button class="tab" data-p="connect" onclick="pick('connect')">${P.tabs.connect}</button>
    <button class="tab" data-p="test" onclick="pick('test')">${P.tabs.test}</button>
  </div>

  <!-- intro -->
  <div class="pane active" id="pane-intro">
    <p class="lead">${P.intro.lead}</p>
    <div class="steps">
      ${P.intro.steps.map(s => `<div class="step"><div class="sn">${s.num}</div><h4>${s.h}</h4><p>${s.p}</p></div>`).join('')}
    </div>
  </div>

  <!-- tools -->
  <div class="pane" id="pane-tools">
    <div class="tool-list">${toolRows}</div>
  </div>

  <!-- connect -->
  <div class="pane" id="pane-connect">
    <div class="cs"><div class="cn">1</div><div class="cb"><b>${P.connect.step1Title}</b><br>${lang === 'en' ? 'Visit the ' : '在 '}<a href="${lang === 'en' ? '/en/dashboard' : '/dashboard'}">${P.connect.step1LinkText}</a> ${P.connect.step1Rest}</div></div>
    <div class="cs"><div class="cn">2</div><div class="cb" style="min-width:0;flex:1"><b>${P.connect.step2Title}</b><br>${P.connect.step2Intro}
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"type"</span>: <span class="str">"http"</span>,
      <span class="str">"url"</span>: <span class="str">"https://mcp.${baseDomain}/mcp"</span>,
      <span class="str">"headers"</span>: { <span class="str">"Authorization"</span>: <span class="str">"Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;"</span> }
    }
  }
}</pre></div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted,#9aa)">${P.connect.m2label}</div>
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"type"</span>: <span class="str">"stdio"</span>,
      <span class="str">"command"</span>: <span class="str">"npx"</span>,
      <span class="str">"args"</span>: [<span class="str">"-y"</span>, <span class="str">"mcp-remote"</span>, <span class="str">"https://mcp.${baseDomain}/mcp"</span>,
               <span class="str">"--header"</span>, <span class="str">"Authorization:\${AUTH_HEADER}"</span>, <span class="str">"--transport"</span>, <span class="str">"http-only"</span>],
      <span class="str">"env"</span>: { <span class="str">"AUTH_HEADER"</span>: <span class="str">"Bearer &lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;"</span> }
    }
  }
}</pre></div>
      <div style="margin-top:8px;font-size:12px;color:var(--dim,#777)">${P.connect.m2note}</div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted,#9aa)">${P.connect.m3label}</div>
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"command"</span>: <span class="str">"npx"</span>,
      <span class="str">"args"</span>: [<span class="str">"-y"</span>, <span class="str">"pagefire-mcp@latest"</span>],
      <span class="str">"env"</span>: { <span class="str">"PAGEFIRE_TOKEN"</span>: <span class="str">"pf_&lt;${lang === 'en' ? 'your-token' : '你的token'}&gt;"</span> }
    }
  }
}</pre></div>
    </div></div>
    <div class="cs" style="border:none;padding-bottom:0"><div class="cn">3</div><div class="cb"><b>${P.connect.step3Title}</b><br>${P.connect.step3Desc}</div></div>

    <div class="conn-info">
      <div class="ci-row"><span class="ci-k">${P.connect.connEndpoint}</span><code class="ic">https://mcp.${baseDomain}/mcp</code></div>
      <div class="ci-row"><span class="ci-k">${P.connect.connTransport}</span><code class="ic">Streamable HTTP · MCP 2025-03-26</code></div>
      <div class="ci-row"><span class="ci-k">${P.connect.connAuth}</span><code class="ic">Authorization: Bearer pf_xxx</code></div>
    </div>

    <div class="sec-sm" style="margin:24px 0 12px">${P.connect.otherTitle}</div>
    <div class="cli-list">
      <div class="cli-row"><div class="cli-name">${P.connect.cursorName}</div><div class="cli-body">${P.connect.cursorDesc}</div></div>
      <div class="cli-row"><div class="cli-name">${P.connect.codexName}</div><div class="cli-body">${P.connect.codexDesc}</div></div>
      <div class="cli-row" style="border:none"><div class="cli-name">${P.connect.otherName}</div><div class="cli-body">${P.connect.otherDesc}</div></div>
    </div>

    <div style="margin-top:40px;padding-top:32px;border-top:1px solid var(--bdr)">
      <div class="sec-sm" style="margin-bottom:6px">CLI</div>
      <div style="font-size:16px;font-weight:650;color:var(--txt);margin-bottom:6px;letter-spacing:-.3px">${P.connect.cliTitle}</div>
      <div style="font-size:13.5px;color:var(--muted);margin-bottom:24px">${P.connect.cliDesc}</div>

      <div class="cs"><div class="cn">1</div><div class="cb"><b>${P.connect.cliStep1}</b>
        <div class="codeblk" style="margin-top:8px"><pre>${P.connect.cliStep1Cmd}</pre></div>
        <div style="font-size:12.5px;color:var(--dim);margin:6px 0 4px">${P.connect.cliStep1Alt}</div>
        <div class="codeblk"><pre>${P.connect.cliStep1AltCmd}</pre></div>
      </div></div>

      <div class="cs"><div class="cn">2</div><div class="cb"><b>${P.connect.cliStep2}</b>
        <div class="codeblk" style="margin-top:8px"><pre><span class="cm">${P.connect.cliStep2Unix}</span>
${P.connect.cliStep2UnixCmd}

<span class="cm">${P.connect.cliStep2Win}</span>
${P.connect.cliStep2WinCmd}</pre></div>
      </div></div>

      <div class="cs" style="border:none;padding-bottom:0"><div class="cn">3</div><div class="cb"><b>${P.connect.cliStep3}</b>
        <div class="codeblk" style="margin-top:8px"><pre>${P.connect.cliCmds.map(c =>
          `<span class="kw">${c.cmd}</span>   <span class="cm"># ${c.desc}</span>`
        ).join('\n')}</pre></div>
        <div style="font-size:12.5px;color:var(--dim);margin-top:8px">${P.connect.cliHelp}</div>
      </div></div>
    </div>
  </div>

  <!-- test -->
  <div class="pane" id="pane-test">
    <div class="panel">
      <div class="panel-b" id="tester-body">
        <div class="gate" id="gate">
          <div class="g-ico">🔑</div>
          <p>${P.test.gatePara}</p>
          <a class="btn-primary" href="${P.test.gateHref}">${P.test.gateBtn}</a>
        </div>
        <div id="tester" style="display:none">
          <div class="row">
            <div class="fld"><label id="lbl-key"></label><select id="key-sel"></select></div>
            <div class="fld"><label id="lbl-tool"></label>
              <select id="tool-sel">${toolOptions}</select>
            </div>
          </div>
          <div id="uprow" style="display:none">
            <div class="dropzone" id="dropzone" onclick="$('file-in').click()">
              <input type="file" id="file-in" style="display:none" onchange="onFile(this)">
              <span id="up-icon"></span> <span id="up-label"></span>
              <div style="margin-top:4px;font-size:11px" id="up-note"></div>
            </div>
          </div>
          <div class="fld"><label id="lbl-args"></label><textarea id="args" spellcheck="false"></textarea>
            <div class="hint" id="lbl-hint"></div>
          </div>
          <div style="margin-top:16px;display:flex;align-items:center;gap:12px">
            <button class="run" id="run-btn" onclick="run()"></button>
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
<footer><div class="w fc">${P.footer}</div></footer>

<script>
const $ = id => document.getElementById(id)
const baseDomain = ${JSON.stringify(baseDomain)}
const _t = ${_t}

// Apply labels
$('lbl-key').textContent = _t.apiKeyLabel
$('lbl-tool').textContent = _t.toolLabel
$('lbl-args').textContent = _t.argsLabel
$('lbl-hint').innerHTML = _t.argsHint
$('run-btn').textContent = _t.runBtn
$('up-icon').textContent = _t.uploadIcon
$('up-label').textContent = _t.uploadLabelDefault
$('up-note').textContent = _t.uploadNoteDefault

function pick(p){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.p===p))
  document.querySelectorAll('.pane').forEach(pn=>pn.classList.toggle('active', pn.id==='pane-'+p))
  if(p==='test' && !testerReady) initTester()
  history.replaceState(null,'','#'+p)
}

const EXAMPLES = {
  deploy_markdown: { markdown: _t.exMarkdownContent, title: _t.exMarkdownTitle, theme: 'light' },
  deploy_page:     { html: _t.exPageHtml, title: _t.exPageTitle },
  deploy_docs:     { title: _t.exDocsTitle, theme: 'light', files: [
    { path: 'index.md', markdown: _t.exDocsIndex },
    { path: 'guide.md', markdown: _t.exDocsGuide } ] },
  deploy_files:    { title: _t.exFilesTitle, files: [
    { path: 'index.html', content: '<html><body><h1>Hello</h1><link rel="stylesheet" href="style.css"></body></html>', encoding: 'utf8' },
    { path: 'style.css',  content: 'body{font-family:sans-serif;background:#f0f0f0}', encoding: 'utf8' } ] },
  deploy_zip:      { title: _t.exZipTitle, spa: false },
  list_deployments: {},
  get_deployment:  { did: _t.exGetDid },
  delete_deployment: { did: _t.exDeleteDid },
  set_access:      { did: _t.exSetAccessDid, access: 'public' },
}
const UPLOAD = {
  deploy_markdown: { accept: '.md,.markdown,.txt', multiple:false, label: _t.uploadLabels['deploy_markdown'] },
  deploy_page:     { accept: '.html,.htm',         multiple:false, label: _t.uploadLabels['deploy_page'] },
  deploy_zip:      { accept: '.zip',               multiple:false, label: _t.uploadLabels['deploy_zip'] },
  deploy_docs:     { accept: '.md,.markdown',      multiple:true,  label: _t.uploadLabels['deploy_docs'] },
  deploy_files:    { accept: '.html,.htm,.css,.js,.json,.svg,.txt,.md', multiple:true, label: _t.uploadLabels['deploy_files'] },
}

function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1900) }
function setArgs(){ $('args').value = JSON.stringify(EXAMPLES[$('tool-sel').value]||{}, null, 2) }
function setArgsObj(o){ $('args').value = JSON.stringify(o, null, 2) }
function syncUpload(){
  const t=$('tool-sel').value, u=UPLOAD[t]
  if(u){
    $('uprow').style.display='block'
    $('file-in').accept=u.accept
    $('file-in').multiple=!!u.multiple
    $('up-label').textContent=u.label
    $('up-note').textContent=_t.uploadOptNote+' ('+u.accept+')'
    $('file-in').value=''
  } else {
    $('uprow').style.display='none'
  }
}

// Drag & drop support
;(()=>{
  const dz=$('dropzone')
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag')})
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag'))
  dz.addEventListener('drop',e=>{
    e.preventDefault(); dz.classList.remove('drag')
    const files=e.dataTransfer?.files
    if(!files?.length) return
    const fi=$('file-in')
    const dt=new DataTransfer()
    ;[...files].forEach(f=>dt.items.add(f))
    fi.files=dt.files
    onFile(fi)
  })
})()

let testerReady=false
async function initTester(){
  testerReady=true
  let ok=false
  try { const r=await fetch('/api/me',{credentials:'same-origin'}); ok=r.ok } catch{}
  if(!ok){ $('gate').style.display=''; $('tester').style.display='none'; testerReady=false; return }
  const kr=await fetch('/api/keys',{credentials:'same-origin'}); const {keys}=await kr.json()
  const active=(keys||[]).filter(k=>k.status==='active')
  if(!active.length){ $('gate').innerHTML='<div class="g-ico">🔑</div><p>'+_t.noKeys+'</p><a class="btn-primary" href="${lang === 'en' ? '/en/dashboard' : '/dashboard'}">'+_t.createKey+'</a>'; return }
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
    else if(t==='deploy_markdown'){ const txt=await readText(files[0]); setArgsObj({ markdown:txt, title:files[0].name.replace(/\\.(md|markdown|txt)$/,''), theme:'light' }) }
    else if(t==='deploy_docs'){ const arr=await Promise.all(files.map(async f=>({ path:f.name, markdown:await readText(f) }))); setArgsObj({ title:_t.exDocsTitle, theme:'light', files:arr }) }
    else if(t==='deploy_files'){
      const isBin = f => /\.(png|jpg|jpeg|gif|ico|woff2?|ttf|eot|pdf)$/i.test(f.name)
      const arr=await Promise.all(files.map(async f=>isBin(f)
        ? { path:f.name, content:await readB64(f), encoding:'base64' }
        : { path:f.name, content:await readText(f), encoding:'utf8' }))
      setArgsObj({ title:_t.exFilesTitle, files:arr })
    }
    $('up-note').textContent = _t.fileLoaded.replace('{n}', files.length)
  } catch { toast(_t.fileError) }
}

async function run(){
  const btn=$('run-btn'), tool=$('tool-sel').value, keyId=$('key-sel').value
  let args; try { args=JSON.parse($('args').value||'{}') } catch { toast(_t.invalidJson); return }
  btn.disabled=true; btn.textContent=_t.runBtnRunning; $('ms').textContent=''
  try {
    const r=await fetch('/api/playground',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key_id:keyId,tool,arguments:args})})
    const d=await r.json(); showResult(r.ok&&d.ok,d); if(d.ms!=null)$('ms').textContent=d.ms+' ms'
  } catch { toast(_t.reqError) }
  btn.disabled=false; btn.textContent=_t.runBtn
}
function showResult(ok,d){
  const res=$('res'); res.classList.add('show')
  $('res-dot').className='dot '+(ok?'ok':'err')
  $('res-label').textContent=ok?_t.callOk:(_t.callFail+(d.error?': '+d.error:''))
  const payload=d.result!==undefined?d.result:d
  const url=payload&&payload.url, u=$('res-url')
  if(ok&&url){ u.style.display='inline-flex'; u.href=url; u.textContent=_t.openPage+' '+url.replace('https://','') } else u.style.display='none'
  $('res-json').textContent=JSON.stringify(payload,null,2)
}
// open the tab from #hash
const h=(location.hash||'').slice(1)
if(['tools','connect','test'].includes(h)) pick(h)
</script>
</body>
</html>`
}
