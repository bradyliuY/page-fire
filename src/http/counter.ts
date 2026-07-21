import type Database from 'better-sqlite3'

const FLUSH_INTERVAL = 60_000 // flush to DB every 60s

/**
 * In-memory view counter that batches increments and periodically flushes to SQLite.
 *
 * The counter is best-effort: a crash may lose at most one flush interval's worth
 * of increments. The cached total (last-flushed DB value + pending delta) is always
 * returned — no stale reads.
 */
export class ViewCounter {
  private pending = new Map<string, number>() // did → delta since last flush
  private cached = new Map<string, number>()  // did → last-flushed DB total
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(private db: Database.Database) {}

  /** Start the periodic flush timer (unref'd — does not keep process alive). */
  start(): void {
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL)
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref()
    }
    console.log('[counter] started, flush interval 60s')
  }

  /** Flush pending increments and stop the timer. Call on shutdown. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.flush()
    console.log('[counter] stopped')
  }

  /** Get current view count (cached DB + pending, no DB read). */
  getViews(did: string): number {
    return this.loadFromDb(did) + (this.pending.get(did) ?? 0)
  }

  /**
   * Increment view count for a deployment.
   * Returns the total count after this increment (includes this visit).
   */
  increment(did: string): number {
    const delta = (this.pending.get(did) ?? 0) + 1
    this.pending.set(did, delta)
    return this.loadFromDb(did) + delta
  }

  /** Flush all pending increments to SQLite in a single transaction. */
  flush(): void {
    if (this.pending.size === 0) return

    const tx = this.db.transaction(() => {
      const update = this.db.prepare(
        'UPDATE deployments SET views = COALESCE(views, 0) + ? WHERE did = ?',
      )
      const select = this.db.prepare(
        'SELECT views FROM deployments WHERE did = ?',
      )

      for (const [did, delta] of this.pending) {
        const r = update.run(delta, did)
        if (r.changes > 0) {
          const row = select.get(did) as { views: number } | undefined
          if (row) this.cached.set(did, row.views)
        }
      }
    })

    try {
      tx()
    } catch (err) {
      console.error('[counter] flush error:', err)
      // Keep pending data — retry on next flush
      return
    }

    this.pending.clear()
  }

  private loadFromDb(did: string): number {
    const cached = this.cached.get(did)
    if (cached !== undefined) return cached
    const row = this.db
      .prepare('SELECT views FROM deployments WHERE did = ?')
      .get(did) as { views: number } | undefined
    const v = row?.views ?? 0
    this.cached.set(did, v)
    return v
  }
}
