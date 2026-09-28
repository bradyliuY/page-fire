import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { deployFiles } from '../../src/core/deploy.js'
import { ValidationError } from '../../src/core/validate.js'

// A redeploy must never destroy the live directory before the new content is in
// place. To prove the rollback path actually runs, force the swap-in rename to
// fail: any rename whose SOURCE is inside `.tmp/` is the `tmp → live` step.
// (vi.mock is hoisted, so the switch has to come from vi.hoisted.)
const fault = vi.hoisted(() => ({ failRenameFromTmp: false }))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    renameSync: (from: string, to: string) => {
      if (fault.failRenameFromTmp && String(from).includes('.tmp')) {
        throw new Error('EIO: simulated rename failure')
      }
      return actual.renameSync(from, to)
    },
  }
})

describe('deployFiles', () => {
  let sitesDir: string
  const tokenId = 'tok'
  const liveOf = (did: string) => join(sitesDir, tokenId, did)

  beforeEach(() => {
    sitesDir = mkdtempSync(join(tmpdir(), 'pf-deploy-'))
  })

  afterEach(() => {
    fault.failRenameFromTmp = false
    rmSync(sitesDir, { recursive: true, force: true })
  })

  it('writes files for a fresh deployment', () => {
    const result = deployFiles(sitesDir, tokenId, 'fresh', [
      { path: 'index.html', content: 'hello' },
      { path: 'css/style.css', content: 'body{}' },
    ])
    expect(result.fileCount).toBe(2)
    expect(readFileSync(join(liveOf('fresh'), 'index.html'), 'utf8')).toBe('hello')
    expect(readFileSync(join(liveOf('fresh'), 'css/style.css'), 'utf8')).toBe('body{}')
  })

  // The bug: redeploy did `rm(live)` then `rename(tmp, live)`. When the rename
  // failed the old site was already gone, so the deployment was lost outright.
  it('restores the previous deployment when the final swap fails', () => {
    deployFiles(sitesDir, tokenId, 'site', [{ path: 'index.html', content: 'v1' }])
    expect(readFileSync(join(liveOf('site'), 'index.html'), 'utf8')).toBe('v1')

    fault.failRenameFromTmp = true
    expect(() => deployFiles(sitesDir, tokenId, 'site', [{ path: 'index.html', content: 'v2' }]))
      .toThrow()
    fault.failRenameFromTmp = false

    expect(existsSync(join(liveOf('site'), 'index.html'))).toBe(true)
    expect(readFileSync(join(liveOf('site'), 'index.html'), 'utf8')).toBe('v1')
  })

  it('keeps the previous deployment when the new payload fails validation', () => {
    deployFiles(sitesDir, tokenId, 'guarded', [{ path: 'index.html', content: 'v1' }])

    expect(() =>
      deployFiles(sitesDir, tokenId, 'guarded', [
        { path: 'index.html', content: 'v2' },
        { path: 'shell.php', content: '<?php' },
      ]),
    ).toThrow(ValidationError)

    expect(readFileSync(join(liveOf('guarded'), 'index.html'), 'utf8')).toBe('v1')
  })

  it('replaces content on a successful redeploy without leaving stray directories', () => {
    deployFiles(sitesDir, tokenId, 'swap', [{ path: 'index.html', content: 'v1' }])
    const result = deployFiles(sitesDir, tokenId, 'swap', [
      { path: 'index.html', content: 'v2' },
      { path: 'app.js', content: 'x' },
    ])

    expect(result.fileCount).toBe(2)
    expect(readFileSync(join(liveOf('swap'), 'index.html'), 'utf8')).toBe('v2')
    // Only the live dir and the .tmp scratch parent may remain.
    const leftovers = readdirSync(join(sitesDir, tokenId)).filter(e => e !== 'swap' && e !== '.tmp')
    expect(leftovers).toEqual([])
  })

  it('does not carry files over from the previous version', () => {
    deployFiles(sitesDir, tokenId, 'stale', [
      { path: 'index.html', content: 'v1' },
      { path: 'old.js', content: 'x' },
    ])
    deployFiles(sitesDir, tokenId, 'stale', [{ path: 'index.html', content: 'v2' }])

    expect(existsSync(join(liveOf('stale'), 'old.js'))).toBe(false)
    expect(readFileSync(join(liveOf('stale'), 'index.html'), 'utf8')).toBe('v2')
  })

  it('leaves no partial output when a file fails mid-write', () => {
    mkdirSync(join(sitesDir, tokenId), { recursive: true })
    writeFileSync(join(sitesDir, tokenId, 'keepme'), 'x')

    expect(() =>
      deployFiles(sitesDir, tokenId, 'partial', [
        { path: 'ok.html', content: 'fine' },
        { path: 'run.sh', content: 'rm -rf /' },
      ]),
    ).toThrow(ValidationError)

    expect(existsSync(liveOf('partial'))).toBe(false)
  })
})
