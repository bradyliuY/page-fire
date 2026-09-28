#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PageFire 密码重置脚本
# 用法: bash scripts/reset-password.sh <用户名> [新密码]
# 默认密码: 1234567
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ── 服务器坐标不入库 ──────────────────────────────────────────
# 本仓库是公开的,不写死主机 IP / 私钥路径。
# 从环境变量或本地 gitignore'd 的 docs/deploy/ssh.env 读取,例如:
#   PAGEFIRE_SERVER=root@203.0.113.10
#   PAGEFIRE_SSH_KEY=docs/deploy/hkt.pem
if [ -f docs/deploy/ssh.env ]; then
  # shellcheck disable=SC1091
  . docs/deploy/ssh.env
fi

SSH_KEY="${PAGEFIRE_SSH_KEY:-docs/deploy/hkt.pem}"
SERVER="${PAGEFIRE_SERVER:-}"
PAGEFIRE_DIR="${PAGEFIRE_DIR:-/opt/pagefire}"
DB_PATH="${PAGEFIRE_DB_PATH:-/var/pagefire/pagefire.db}"

if [ -z "$SERVER" ]; then
  echo "❌ 未设置 PAGEFIRE_SERVER —— 服务器地址不入库。" >&2
  echo "   请用 PAGEFIRE_SERVER=root@<服务器 IP> bash $0 ... 运行," >&2
  echo "   或写入 docs/deploy/ssh.env(gitignored)。" >&2
  exit 1
fi

USERNAME="${1:-}"
PASSWORD="${2:-1234567}"

if [ -z "$USERNAME" ]; then
  echo "用法: bash scripts/reset-password.sh <用户名> [新密码]"
  echo "示例: bash scripts/reset-password.sh linn"
  echo "示例: bash scripts/reset-password.sh linn myNewPass123"
  exit 1
fi

echo "🔑 重置 PageFire 用户 [$USERNAME] 的密码..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" \
  "cd $PAGEFIRE_DIR && node -e \"
const sqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = sqlite3('$DB_PATH');
const hash = bcrypt.hashSync('$PASSWORD', 10);
const info = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, '$USERNAME');
if (info.changes === 0) {
  console.log('❌ 用户 [$USERNAME] 不存在');
  process.exit(1);
}
const r = db.prepare('SELECT username, substr(password_hash,1,20) AS h FROM users WHERE username = ?').get('$USERNAME');
const ok = bcrypt.compareSync('$PASSWORD', r.h + '...');
console.log('✅ 密码已重置');
console.log('   用户名: ' + r.username);
console.log('   新密码: $PASSWORD');
db.close();
\""

echo "📋 验证: 已可通过 curl 测试登录"
echo "   curl -s -X POST http://127.0.0.1:4000/api/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}'"
