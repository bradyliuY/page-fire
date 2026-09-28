#!/usr/bin/env bash
# PageFire 数据备份 —— SQLite 一致快照 + 站点文件增量(硬链接去重)。
#
# 设计取舍:
#   - **数据库**走 better-sqlite3 的在线备份 API:服务在 WAL 下持续写入,直接 `cp`
#     会拿到撕裂的库,必须让 SQLite 自己出一致快照。
#   - **静态文件**用 `rsync --link-dest`(rsnapshot 式):未变的文件与上一份备份
#     **共享 inode**,所以每天一份备份几乎不额外占空间,而每份又都是**完整可读的
#     目录树** —— 不像增量链,中间坏一份不至于全废。
#   - 保留最近 $KEEP 份,超出自动轮转删除。
#
# 安装(在服务器上):
#   cp scripts/backup.sh /opt/pagefire/scripts/backup.sh
#   chmod +x /opt/pagefire/scripts/backup.sh
#   # 每天 03:37 跑一次(crontab 里加这一行)
#   37 3 * * * /opt/pagefire/scripts/backup.sh >> /var/log/pagefire-backup.log 2>&1
#
# 可覆盖的环境变量(默认值即 docs/DEPLOY.md 的目录约定):
#   PAGEFIRE_DB          SQLite 路径             默认 /var/pagefire/pagefire.db
#   PAGEFIRE_SITES       站点文件目录             默认 /var/pagefire/sites
#   PAGEFIRE_BACKUP_DIR  备份落盘目录             默认 /var/pagefire-backups
#   PAGEFIRE_APP_DIR     代码目录(备库要用它的 node_modules)  默认 /opt/pagefire
#   PAGEFIRE_BACKUP_KEEP 保留份数                 默认 14
set -euo pipefail

DB="${PAGEFIRE_DB:-/var/pagefire/pagefire.db}"
SITES="${PAGEFIRE_SITES:-/var/pagefire/sites}"
DEST="${PAGEFIRE_BACKUP_DIR:-/var/pagefire-backups}"
APP_DIR="${PAGEFIRE_APP_DIR:-/opt/pagefire}"
KEEP="${PAGEFIRE_BACKUP_KEEP:-14}"

if [ ! -f "$DB" ]; then
  echo "找不到数据库 $DB —— 检查 PAGEFIRE_DB,或服务还没初始化过" >&2
  exit 1
fi

# 轮转靠 `rm -rf "$DEST"/20*/`,所以 DEST 一旦被设成 "/" 之类就是灾难。
# 这类脚本多半挂在 cron 上无人值守,宁可拒绝执行。
case "$DEST" in
  ""|/|/var|/opt|/usr|/etc|"$HOME")
    echo "拒绝在 $DEST 上轮转备份(路径太危险),请用 PAGEFIRE_BACKUP_DIR 指定一个专用目录" >&2
    exit 1
    ;;
esac

TS=$(date +%F_%H%M%S)
NEW="$DEST/$TS"

# 上一份备份(供硬链接去重)—— 必须在创建 $NEW **之前**解析:否则刚建出来的空目录
# 会排在最后被选中,link-dest 指向它,去重直接失效。同时排除与自己同名的情况。
mkdir -p "$DEST"
PREV=$(ls -1d "$DEST"/20*/ 2>/dev/null | grep -v "/$TS/" | sort | tail -1 || true)
LINKDEST=""
if [ -n "${PREV:-}" ] && [ -d "${PREV%/}/sites" ]; then
  LINKDEST="--link-dest=${PREV%/}/sites"
fi

mkdir -p "$NEW/sites"

# 1) 静态文件 —— 增量,未变文件硬链接自上一份备份。
if [ -d "$SITES" ]; then
  rsync -a --delete ${LINKDEST} "$SITES/" "$NEW/sites/"
else
  echo "注意:$SITES 不存在,跳过站点文件备份" >&2
fi

# 2) 数据库 —— 在线一致备份(WAL 下服务仍在写也安全)。
#    路径经环境变量传入,不拼进 JS 字符串 —— 路径里有引号/空格也不会把脚本弄坏。
cd "$APP_DIR" && PF_DB="$DB" PF_OUT="$NEW/$(basename "$DB")" node -e '
const Database = require("better-sqlite3");
const db = new Database(process.env.PF_DB, { readonly: true });
db.backup(process.env.PF_OUT)
  .then(() => { db.close(); process.exit(0); })
  .catch((e) => { console.error("db backup failed:", e); process.exit(1); });
'

# 3) 轮转 —— 保留最近 $KEEP 份。
ls -1d "$DEST"/20*/ 2>/dev/null | sort | head -n -"$KEEP" | xargs -r rm -rf

# 4) 指向最新一份的便捷软链。
ln -sfn "$NEW" "$DEST/latest"

echo "[$(date '+%F %T')] backup ok: $NEW (sites $(du -sh "$NEW/sites" 2>/dev/null | cut -f1), db $(du -h "$NEW/$(basename "$DB")" 2>/dev/null | cut -f1)), total dir $(du -sh "$DEST" 2>/dev/null | cut -f1)"
