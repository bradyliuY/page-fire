// 纯原生 JS 模拟 SPA 路由，无需框架
// 实际项目中这里是 React/Vue/Svelte 的打包产物

const routes = {
  '/': homePage,
  '/about': aboutPage,
  '/dashboard': dashboardPage,
  '/settings': settingsPage,
}

function homePage() {
  return `
    <nav>
      <a class="nav-logo" href="/">SPA 示例</a>
      <a href="/" class="active">首页</a>
      <a href="/about">关于</a>
      <a href="/dashboard">数据面板</a>
      <a href="/settings">设置</a>
    </nav>
    <div class="page">
      <div class="badge">SPA 模式 · 客户端路由</div>
      <h1>SPA 应用示例</h1>
      <p>这个站点只有一个 index.html 文件，路由完全由 JavaScript 控制。</p>
      <p>你可以直接访问 <code>/about</code>、<code>/dashboard</code> 等子路由，或刷新页面，都不会 404。</p>
      <p>这是因为 PageFire 开启了 <strong>SPA 模式</strong>（spa: true），所有未匹配的路径都会回退到 index.html。</p>
      <div class="card-grid">
        <div class="card"><h3>🔄 客户端路由</h3><p>pushState API，无需页面刷新</p></div>
        <div class="card"><h3>🔁 刷新安全</h3><p>直接访问子路由不会 404</p></div>
        <div class="card"><h3>📦 单文件入口</h3><p>只有 index.html + 静态资源</p></div>
      </div>
    </div>
  `
}

function aboutPage() {
  return `
    <nav>
      <a class="nav-logo" href="/">SPA 示例</a>
      <a href="/">首页</a>
      <a href="/about" class="active">关于</a>
      <a href="/dashboard">数据面板</a>
      <a href="/settings">设置</a>
    </nav>
    <div class="page">
      <h1>关于页面</h1>
      <p>当前路由：<strong>/about</strong></p>
      <p>这个页面没有对应的 about.html 文件。你直接在浏览器地址栏输入这个 URL 或刷新，服务器返回的是 index.html，然后 JS 根据 URL 渲染了这个页面。</p>
      <p><a href="/" style="color:#22d3ee">← 返回首页</a></p>
    </div>
  `
}

function dashboardPage() {
  const data = [
    { label: '今日访问', value: '2,847' },
    { label: '活跃用户', value: '384' },
    { label: '转化率', value: '3.2%' },
    { label: '收入', value: '¥12,450' },
  ]
  return `
    <nav>
      <a class="nav-logo" href="/">SPA 示例</a>
      <a href="/">首页</a>
      <a href="/about">关于</a>
      <a href="/dashboard" class="active">数据面板</a>
      <a href="/settings">设置</a>
    </nav>
    <div class="page">
      <h1>数据面板</h1>
      <p>当前路由：<strong>/dashboard</strong></p>
      <div class="card-grid">
        ${data.map(d => `<div class="card"><h3>${d.value}</h3><p>${d.label}</p></div>`).join('')}
      </div>
    </div>
  `
}

function settingsPage() {
  return `
    <nav>
      <a class="nav-logo" href="/">SPA 示例</a>
      <a href="/">首页</a>
      <a href="/about">关于</a>
      <a href="/dashboard">数据面板</a>
      <a href="/settings" class="active">设置</a>
    </nav>
    <div class="page">
      <h1>设置</h1>
      <p>当前路由：<strong>/settings</strong></p>
      <p>尝试刷新这个页面，看看 PageFire SPA 模式是否正确回退到 index.html 并重新渲染当前路由。</p>
    </div>
  `
}

function render() {
  const path = window.location.pathname
  const page = routes[path] || (() => `<div class="page"><h1>404</h1><p>客户端找不到路由：${path}</p><a href="/" style="color:#22d3ee">← 返回首页</a></div>`)
  document.getElementById('app').innerHTML = page()

  // 激活当前导航链接
  document.querySelectorAll('nav a[href]').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === path)
  })
}

// 拦截 <a href> 点击，走 pushState 而不是全页刷新
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]')
  if (!a) return
  const href = a.getAttribute('href')
  if (!href || href.startsWith('http') || href.startsWith('//')) return
  e.preventDefault()
  history.pushState(null, '', href)
  render()
})

window.addEventListener('popstate', render)
render()
