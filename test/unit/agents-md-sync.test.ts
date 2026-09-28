import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Guard: `AGENTS.md`(Codex)与 `CLAUDE.md`(Claude Code)是同一份指令的两个入口。
 *
 * 手工维护的孪生副本**必然漂移** —— 本项目已经发生过一次:改了 CLAUDE.md 而
 * AGENTS.md 停在旧结构,两个工具于是读到互相矛盾的架构描述。
 *
 * 所以约定:**CLAUDE.md 是唯一来源**,AGENTS.md 由它生成,只有头部三行不同。
 * 这条测试让任何漂移立刻变红,而不是等到某个 agent 照旧文档改错东西。
 *
 * AGENTS.md 在本仓库是**未提交**的本地文件(连同 `.codex/`、`.agents/`),
 * 因此不存在时跳过 —— 别人的 clone 里没有它,不该因此红。
 *
 * 重新生成:
 *   { printf '# AGENTS.md\n\nThis file provides guidance to Codex (Codex.ai/code) when working with code in this repository.\n'; tail -n +4 CLAUDE.md; } > AGENTS.md
 */

const REPO_ROOT = join(__dirname, '..', '..')
const CLAUDE = join(REPO_ROOT, 'CLAUDE.md')
const AGENTS = join(REPO_ROOT, 'AGENTS.md')

const HEADER_LINES = 3

/** 统一换行,避免 CRLF/LF 造成假红。 */
function body(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n').slice(HEADER_LINES).join('\n')
}

describe('AGENTS.md 与 CLAUDE.md 保持同步', () => {
  it('CLAUDE.md 存在(唯一来源不能丢)', () => {
    expect(existsSync(CLAUDE)).toBe(true)
  })

  const hasAgents = existsSync(AGENTS)

  it.skipIf(!hasAgents)('AGENTS.md 除头部外与 CLAUDE.md 逐字一致', () => {
    expect(body(AGENTS)).toBe(body(CLAUDE))
  })

  it.skipIf(!hasAgents)('两份文件的头部各自正确', () => {
    const claudeHead = readFileSync(CLAUDE, 'utf8').split('\n').slice(0, HEADER_LINES).join('\n')
    const agentsHead = readFileSync(AGENTS, 'utf8').split('\n').slice(0, HEADER_LINES).join('\n')

    expect(claudeHead).toContain('# CLAUDE.md')
    expect(claudeHead).toContain('Claude Code')
    expect(agentsHead).toContain('# AGENTS.md')
    expect(agentsHead).toContain('Codex')
  })
})
