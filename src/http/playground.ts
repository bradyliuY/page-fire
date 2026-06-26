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
    <div class="tool-list">
      <div class="tl-row"><div class="tl-name">deploy_page</div><div class="tl-body"><div class="tl-title">单页 HTML</div><div class="tl-desc">发布一段 HTML 字符串，立即得到独立 HTTPS 子域名，适合 AI 生成的报告与落地页。</div><div class="params"><code>html</code> <code>title?</code> <code>did?</code> <code>access?</code> <code>password?</code> <code>ttl_days?</code> <code>pin?</code> <code>spa?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">deploy_markdown</div><div class="tl-body"><div class="tl-title">Markdown 渲染</div><div class="tl-desc">Markdown 渲染成精致排版网页，支持 light / dark / sepia 三主题，代码高亮、表格、任务列表开箱即用。自动剥离 YAML frontmatter。</div><div class="params"><code>markdown</code> <code>theme?</code> <code>title?</code> <code>did?</code> <code>access?</code> <code>pin?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">deploy_docs</div><div class="tl-body"><div class="tl-title">多页文档站</div><div class="tl-desc">多篇 Markdown 文件自动生成带左侧导航 + 右侧目录的文档站，无需 index.md（自动推断入口），.md 链接自动改写为 .html。</div><div class="params"><code>files[]</code> <code>title?</code> <code>theme?</code> <code>did?</code> <code>pin?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">deploy_files</div><div class="tl-body"><div class="tl-title">多文件站点</div><div class="tl-desc">逐文件发布 HTML + CSS + JS，支持子目录结构，二进制文件用 base64 编码传输。</div><div class="params"><code>files[]</code> <code>did?</code> <code>spa?</code> <code>pin?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">deploy_zip</div><div class="tl-body"><div class="tl-title">整站打包</div><div class="tl-desc">上传 ZIP 包自动解压发布，支持 SPA 模式（客户端路由 fallback 到 index.html）。</div><div class="params"><code>zip_base64</code> <code>did?</code> <code>spa?</code> <code>pin?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">set_access</div><div class="tl-body"><div class="tl-title">修改访问控制</div><div class="tl-desc">随时切换已有站点的访问方式：public（公开）/ password（密码保护）/ private（私有），无需重新发布内容。</div><div class="params"><code>did</code> <code>access</code> <code>password?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">list_deployments</div><div class="tl-body"><div class="tl-title">列出部署</div><div class="tl-desc">列出当前 API Key 下的所有站点，返回 URL、状态、文件数、大小、创建时间。</div><div class="params"><code>include_expired?</code></div></div></div>
      <div class="tl-row"><div class="tl-name">get_deployment</div><div class="tl-body"><div class="tl-title">查询单个部署</div><div class="tl-desc">获取指定站点的完整详情，包括 URL、文件列表、访问控制、过期时间。</div><div class="params"><code>did</code></div></div></div>
      <div class="tl-row"><div class="tl-name">delete_deployment</div><div class="tl-body"><div class="tl-title">删除部署</div><div class="tl-desc">立即删除指定站点及其全部文件，释放存储配额，不可恢复。</div><div class="params"><code>did</code></div></div></div>
      <div class="tl-row"><div class="tl-name">pin_deployment</div><div class="tl-body"><div class="tl-title">永久保留</div><div class="tl-desc">将临时站点（设有 TTL）标记为永久保留，跳过自动 GC 清理。</div><div class="params"><code>did</code></div></div></div>
      <div class="tl-row"><div class="tl-name">set_space_id</div><div class="tl-body"><div class="tl-title">自定义子域名</div><div class="tl-desc">设置当前 API Key 的 space_id 段（全局唯一），影响该 Key 下所有站点的子域名。</div><div class="params"><code>space_id</code></div></div></div>
    </div>
  </div>

  <!-- 接入 -->
  <div class="pane" id="pane-connect">
    <div class="cs"><div class="cn">1</div><div class="cb"><b>获取 Token</b><br>在 <a href="/dashboard">控制台</a> 注册并创建 API Key（<code class="ic">pf_</code> 开头）。</div></div>
    <div class="cs"><div class="cn">2</div><div class="cb" style="min-width:0;flex:1"><b>配置连接</b><br>以 Claude Desktop / Claude Code 为例，在项目根目录创建 <code class="ic">.mcp.json</code>（加入 .gitignore）：
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"type"</span>: <span class="str">"http"</span>,
      <span class="str">"url"</span>: <span class="str">"https://mcp.${baseDomain}/mcp"</span>,
      <span class="str">"headers"</span>: { <span class="str">"Authorization"</span>: <span class="str">"Bearer &lt;你的token&gt;"</span> }
    }
  }
}</pre></div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted,#9aa)">方式二 · <b>stdio 桥接</b>（连不上时的兜底）：若上面的 HTTP 直连报 <code class="ic">Failed to connect</code>，但浏览器 / Node 能访问该域名，多为客户端运行时 TLS 被网络按指纹拦截。改用本机 Node 的 <a href="https://www.npmjs.com/package/mcp-remote" target="_blank" rel="noopener">mcp-remote</a> 桥接同一端点：</div>
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"type"</span>: <span class="str">"stdio"</span>,
      <span class="str">"command"</span>: <span class="str">"npx"</span>,
      <span class="str">"args"</span>: [<span class="str">"-y"</span>, <span class="str">"mcp-remote"</span>, <span class="str">"https://mcp.${baseDomain}/mcp"</span>,
               <span class="str">"--header"</span>, <span class="str">"Authorization:\${AUTH_HEADER}"</span>, <span class="str">"--transport"</span>, <span class="str">"http-only"</span>],
      <span class="str">"env"</span>: { <span class="str">"AUTH_HEADER"</span>: <span class="str">"Bearer &lt;你的token&gt;"</span> }
    }
  }
}</pre></div>
      <div style="margin-top:8px;font-size:12px;color:var(--dim,#777)">⚠️ token 须经 <code class="ic">env.AUTH_HEADER</code> 传入、header 写成 <code class="ic">Authorization:\${AUTH_HEADER}</code>（无空格）；写成 <code class="ic">"Authorization: Bearer ..."</code> 会因空格拆断导致工具调用 <code class="ic">UNAUTHORIZED</code>。</div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted,#9aa)">方式三 · <b>npm 连接器包</b>（最简，推荐）：已发布 <a href="https://www.npmjs.com/package/pagefire-mcp" target="_blank" rel="noopener">pagefire-mcp</a>，token 只走环境变量、无 URL、无 header 坑：</div>
      <div class="codeblk" style="margin-top:10px"><pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"pagefire"</span>: {
      <span class="str">"command"</span>: <span class="str">"npx"</span>,
      <span class="str">"args"</span>: [<span class="str">"-y"</span>, <span class="str">"pagefire-mcp@latest"</span>],
      <span class="str">"env"</span>: { <span class="str">"PAGEFIRE_TOKEN"</span>: <span class="str">"pf_&lt;你的token&gt;"</span> }
    }
  }
}</pre></div>
    </div></div>
    <div class="cs" style="border:none;padding-bottom:0"><div class="cn">3</div><div class="cb"><b>对话发布</b><br>重启客户端后直接说："帮我把这份内容发布成网页"，AI 自动调用工具完成发布。</div></div>

    <div class="conn-info">
      <div class="ci-row"><span class="ci-k">端点</span><code class="ic">https://mcp.${baseDomain}/mcp</code></div>
      <div class="ci-row"><span class="ci-k">传输</span><code class="ic">Streamable HTTP · MCP 2025-03-26</code></div>
      <div class="ci-row"><span class="ci-k">鉴权</span><code class="ic">Authorization: Bearer pf_xxx</code></div>
    </div>

    <div class="sec-sm" style="margin:24px 0 12px">其他客户端</div>
    <div class="cli-list">
      <div class="cli-row"><div class="cli-name">Cursor</div><div class="cli-body">Settings → MCP → Add new global MCP server，填入端点 URL 与 Authorization header。Cursor 不读取 .mcp.json，需在全局设置里配置。</div></div>
      <div class="cli-row"><div class="cli-name">OpenAI Codex</div><div class="cli-body">在 <code class="ic">codex.yaml</code> 的 <code class="ic">mcp_servers</code> 下添加：<code class="ic">type: http</code>、<code class="ic">url</code>、<code class="ic">headers.Authorization</code>。</div></div>
      <div class="cli-row" style="border:none"><div class="cli-name">其他</div><div class="cli-body">任何支持 Streamable HTTP transport 的 MCP 客户端均可，填入端点 URL 与 Bearer Token 即可。</div></div>
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
                <option value="deploy_docs">deploy_docs — 文档站（多 .md）</option>
                <option value="deploy_files">deploy_files — 多文件站点（HTML/CSS/JS）</option>
                <option value="deploy_zip">deploy_zip — 整站打包（.zip）</option>
                <option value="list_deployments">list_deployments — 列出部署</option>
                <option value="get_deployment">get_deployment — 查询单个部署</option>
                <option value="delete_deployment">delete_deployment — 删除部署</option>
                <option value="set_access">set_access — 修改访问控制</option>
              </select>
            </div>
          </div>
          <div id="uprow" style="display:none">
            <div class="dropzone" id="dropzone" onclick="$('file-in').click()">
              <input type="file" id="file-in" style="display:none" onchange="onFile(this)">
              <span id="up-icon">📎</span> <span id="up-label">点击或拖拽文件到此处</span>
              <div style="margin-top:4px;font-size:11px" id="up-note">可选：上传文件自动填入参数</div>
            </div>
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
  deploy_markdown: { markdown: "# 你好，PageFire\\n\\n这是用 **deploy_markdown** 渲染的页面。\\n\\n- 支持表格、代码块\\n- 三种主题：light / dark / sepia\\n", title: "测试页", theme: "light" },
  deploy_page:     { html: "<h1>Hello PageFire</h1><p>这是 deploy_page 发布的页面。</p>", title: "测试页" },
  deploy_docs:     { title: "测试文档", theme: "light", files: [
    { path: "index.md", markdown: "# 首页\\n\\n前往 [指南](./guide.md)。" },
    { path: "guide.md", markdown: "# 指南\\n\\n返回 [首页](./index.md)。" } ] },
  deploy_files:    { title: "多文件站", files: [
    { path: "index.html", content: "<html><body><h1>Hello</h1><link rel='stylesheet' href='style.css'></body></html>", encoding: "utf8" },
    { path: "style.css",  content: "body{font-family:sans-serif;background:#f0f0f0}", encoding: "utf8" } ] },
  deploy_zip:      { title: "整站", spa: false },
  list_deployments: {},
  get_deployment:  { did: "填写站点别名" },
  delete_deployment: { did: "填写站点别名" },
  set_access:      { did: "填写站点别名", access: "public" },
}
// which tools accept an uploaded file, and the accept filter
const UPLOAD = {
  deploy_markdown: { accept: '.md,.markdown,.txt', multiple:false, label:'上传 .md / .txt' },
  deploy_page:     { accept: '.html,.htm',         multiple:false, label:'上传 .html' },
  deploy_zip:      { accept: '.zip',               multiple:false, label:'上传 .zip' },
  deploy_docs:     { accept: '.md,.markdown',      multiple:true,  label:'上传多个 .md' },
  deploy_files:    { accept: '.html,.htm,.css,.js,.json,.svg,.txt,.md', multiple:true, label:'上传多个文件（HTML/CSS/JS…）' },
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
    $('up-note').textContent='可选：上传文件，自动填入参数（' + u.accept + '）'
    $('file-in').value=''  // reset so same file can be re-selected
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
    // DataTransfer trick to populate the file input
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
    else if(t==='deploy_markdown'){ const txt=await readText(files[0]); setArgsObj({ markdown:txt, title:files[0].name.replace(/\\.(md|markdown|txt)$/,''), theme:'light' }) }
    else if(t==='deploy_docs'){ const arr=await Promise.all(files.map(async f=>({ path:f.name, markdown:await readText(f) }))); setArgsObj({ title:'文档站', theme:'light', files:arr }) }
    else if(t==='deploy_files'){
      const isBin = f => /\.(png|jpg|jpeg|gif|ico|woff2?|ttf|eot|pdf)$/i.test(f.name)
      const arr=await Promise.all(files.map(async f=>isBin(f)
        ? { path:f.name, content:await readB64(f), encoding:'base64' }
        : { path:f.name, content:await readText(f), encoding:'utf8' }))
      setArgsObj({ title:'多文件站', files:arr })
    }
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
