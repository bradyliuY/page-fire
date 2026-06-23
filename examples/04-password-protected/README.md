# 示例：密码保护页面

**场景**：发布内部报告、机密文档，仅凭密码才能访问。

**使用工具**：`deploy_page` 或 `deploy_files`，加 `access: "password"`

## 对 AI 说

```
把 examples/04-password-protected/index.html 发布成网页，
设置密码保护，密码是 Q2-internal，有效期 30 天。
```

## 关键点

- 未携带正确密码的请求返回 **401**，不暴露任何内容
- 访问时需在请求头加 `X-Passphrase: <密码>`
- 浏览器直接访问会看到 401 页面；可搭配简单前置登录页使用

## 前置登录页方案（可选）

部署两个站点：
1. **登录页**（public）：输入密码 → 存 localStorage → 跳转到主站
2. **主站**（password 模式）：JS 从 localStorage 取密码，发请求时带 `X-Passphrase` 头

## 适用场景

- 季度/年度财务报告
- 内部人事文件
- 客户专属方案文档
- Beta 版产品演示（限定受众）
