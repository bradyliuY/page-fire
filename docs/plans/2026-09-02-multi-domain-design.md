# 设计:多基础域名支持(pagefire.hkting.com)

日期:2026-09-02 · 状态:已实施

> 本文只保留**可公开**的架构决策。具体服务器坐标(主机 IP、证书目录、同机容器名、
> SSH 凭据)不进仓库,只留在运维本地的私有笔记里。

## 背景

在 `pagefire.openhkt.com` 之外增加 `pagefire.hkting.com` 作为完全等价的第二访问域名(阿里云 DNS 托管,与既有业务同机部署)。两个域名同时在线,功能一模一样。

## 代码决策

1. **`PAGEFIRE_BASE_DOMAIN` 支持逗号分隔多域名**(`src/config.ts::parseBaseDomains`):
   小写、去重、去空段,首个为**主域名**;`config.baseDomain` 语义不变(发布返回的 URL、
   MCP endpoint、API base_url 仍生成主域名),新增 `config.baseDomains` 供路由使用。
2. **纯函数匹配**(`src/http/base-domain.ts::resolveBaseDomain`):host(小写化)等于某域名
   或以其为后缀 → 返回该域名;否则 null。单元测试:`test/unit/base-domain.test.ts`。
3. **路由**(`src/http/router.ts`):主站判断与子域名后缀解析都按域名列表进行;
   首页/仪表盘/Playground 用**命中域名**渲染 → 每个域名上的页面链接自洽
   (hkting 首页展示 `mcp.pagefire.hkting.com`);OG meta 同理。
   未命中域名 → 404(含 `x.base.a.com` 类后缀欺骗)。
4. 硬编码的 `pagefire.openhkt.com` 仅存在于 markdown/docs 页脚与 i18n 示例文案 —— 品牌链接,保留。

## 基础设施决策

1. **DNS**(阿里云 API):hkting.com zone 加 `pagefire A` + `*.pagefire A → <your-server-ip>`。
2. **证书**:通配符必须 DNS-01。acme.sh `--dns dns_ali`(RAM 子账号 AK,仅 AliyunDNS 权限)
   签 `pagefire.hkting.com + *.pagefire.hkting.com`,装到同机 nginx 容器的 certbot 配置目录
   (`<nginx-certbot-conf>/pagefire-hkting/`)。
   reloadcmd 用 `docker exec <nginx-container> nginx -s reload`(比原 `docker restart` 温和)。
3. **顺带修复**:原 `pagefire.openhkt.com` 通配证书是手动 TXT 签发(`Le_Webroot='dns'`),
   自动续期实际不可用(2026-09-08 起续期失败、~09-21 过期)。用同一 AK 以 dns_ali 重签,
   凭据持久化到 acme.sh → 恢复全自动续期。
4. **nginx**(只追加,不动既有块):镜像现有两块,`*.pagefire.hkting.com pagefire.hkting.com` → 4000,
   `mcp.pagefire.hkting.com` → 4100(Streamable HTTP 参数同现状)。
5. **部署**:`.env` 改 `PAGEFIRE_BASE_DOMAIN=pagefire.hkting.com,pagefire.openhkt.com`
   (按用户要求 **hkting 为主域名**,发布链接/MCP endpoint 默认 hkting;openhkt 完全保留),
   scp dist 增量文件 + `pm2 restart pagefire`。

## 验证

- 单测 93/93 通过(新增 10 个域名匹配用例,RED→GREEN)。
- 本地端到端:`localhost,pagefire.hkting.com` 双域名配置下,CLI 建 token → MCP 发布 →
  两域名 Host 头均 200 且内容/计数器一致;未配置域名、后缀欺骗、过期部署均 404。
