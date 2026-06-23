# 示例：SPA 单页应用

**场景**：发布 React / Vue / Svelte 等框架打包后的 dist/ 目录，支持客户端路由。
刷新 `/dashboard`、直接访问 `/about` 不会 404。

**使用工具**：`deploy_zip`（ZIP 包 + `spa: true`）

## 文件结构

```
index.html          # 唯一入口 HTML
assets/
  style.css         # 样式
  app.js            # 应用逻辑（实际项目为打包产物）
```

## 对 AI 说

```
把 examples/03-spa-app/ 目录打包成 ZIP，发布为 SPA 模式，
标题"SPA 应用"，永久保留。
```

## 对 AI 说（React 实际项目）

```
我用 `npm run build` 生成了 dist/ 目录，把它发布到 PageFire，
开启 SPA 模式，永久保留。
```

## 关键点

- **必须设 `spa: true`**：否则刷新子路由会返回 404
- ZIP 包里必须有 `index.html` 在根目录
- 静态资源用相对路径引用（`./assets/app.js`），不要用 `/assets/app.js` 的绝对路径（在子路由下会找不到）

  > React CRA / Vite 打包时设置 `homepage: "."` 或 `base: "./"` 来确保相对路径

## 适用场景

- React / Vue / Svelte / Angular 打包产物
- 需要客户端路由的应用
- 内部工具、管理后台原型
- 数据可视化 Dashboard
