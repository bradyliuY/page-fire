#!/bin/bash
# ─────────────────────────────────────────────────────────────
# PageFire 密码重置脚本
# 用法: bash scripts/reset-password.sh <用户名> [新密码]
# 默认密码: 1234567
# ─────────────────────────────────────────────────────────────

set -euo pipefail

USERNAME="${1:-}"
PASSWORD="${2:-1234567}"
SSH_KEY="docs/deploy/hkt.pem"
SERVER="root@8.163.52.153"
PAGEFIRE_DIR="/opt/pagefire"
DB_PATH="/var/pagefire/pagefire.db"

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
