import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Step, StepStatus } from '../types'

const steps = atom({ plugin: 'work-bar', key: 'steps' } as const, [])
const startedAt = atom({ plugin: 'work-bar', key: 'startedAt' } as const, 0)
const now = atom({ plugin: 'work-bar', key: 'now' } as const, 0)

const BAR_WIDTH = 24
const PLAN_TOOL = 'mcp__ccd_turn__update_plan'

const asSteps = (list: unknown): Step[] =>
  Array.isArray(list)
    ? list.flatMap(item => {
        const s = item as { content?: unknown; status?: unknown }

        return typeof s.content === 'string'
          ? [{ content: s.content, status: (s.status as StepStatus) ?? 'pending' }]
          : []
      })
    : []

// Mirrors update_plan: `items` replaces the list, `advance` completes the
// running step and starts the next, `done` / `start` are 1-based indexes.
const applyPlan = (prev: Step[], input: Record<string, unknown>): Step[] => {
  let next = prev.map(s => ({ ...s }))

  if (Array.isArray(input.items)) {
    next = asSteps(input.items)
  }

  if (input.advance === true) {
    const running = next.findIndex(s => s.status === 'in_progress')

    if (running >= 0) {
      next[running].status = 'completed'
    }

    const upcoming = next.findIndex(s => s.status === 'pending')

    if (upcoming >= 0) {
      next[upcoming].status = 'in_progress'
    }
  }

  if (Array.isArray(input.done)) {
    for (const n of input.done) {
      if (typeof n === 'number' && next[n - 1]) {
        next[n - 1].status = 'completed'
      }
    }
  }

  if (typeof input.start === 'number' && next[input.start - 1]) {
    next[input.start - 1].status = 'in_progress'
  }

  return next
}

const fmt = (seconds: number) =>
  seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`

const solidBar = (done: number, total: number) => {
  const filled = Math.round((done / total) * BAR_WIDTH)

  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled)
}

// No plan, so no honest percent: a block sweeping back and forth.
const sweepBar = (tick: number) => {
  const block = 5
  const span = BAR_WIDTH - block
  const phase = tick % (span * 2)
  const at = phase <= span ? phase : span * 2 - phase

  return '░'.repeat(at) + '█'.repeat(block) + '░'.repeat(span - at)
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    const t = await $.clock.now()
    await update($, steps, () => [])
    await update($, startedAt, () => t)
    await update($, now, () => t)

    timer?.cancel()
    timer = $.clock.every(1000, async () => {
      const current = await $.clock.now()
      await update($, now, () => current)
    })

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      timer?.cancel()
      timer = undefined
    }

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // Observe only: a failure here must never get in the way of the tool call.
    try {
      if (e.agentId === undefined) {
        if (e.tool === 'TodoWrite') {
          const todos = asSteps(e.todos)
          await update($, steps, () => todos)
        } else if (e.tool === PLAN_TOOL) {
          const input = e as unknown as Record<string, unknown>
          await update($, steps, prev => applyPlan(prev, input))
        }
      }
    } catch {
      // progress display is best-effort
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !e.props.isWorking) {
      return next(e)
    }

    const [list, start, current] = await Promise.all([
      read($, steps),
      read($, startedAt),
      read($, now),
    ])
    const seconds = Math.max(0, Math.round((current - start) / 1000))
    const { Box, Text } = $.ui.resolve(e)

    if (list.length === 0) {
      return (
        <Box>
          <Text color="cyan">Working </Text>
          <Text color="cyan">{sweepBar(seconds)}</Text>
          <Text dimColor> {fmt(seconds)}</Text>
        </Box>
      )
    }

    const done = list.filter(s => s.status === 'completed').length
    const percent = Math.round((done / list.length) * 100)
    const running = list.find(s => s.status === 'in_progress')

    return (
      <Box>
        <Text color="cyan">Working </Text>
        <Text color="cyan">{solidBar(done, list.length)}</Text>
        <Text>
          {' '}
          {percent}% ({done}/{list.length})
        </Text>
        <Text dimColor>
          {' '}
          {fmt(seconds)}
          {running ? ` · ${running.content}` : ''}
        </Text>
      </Box>
    )
  })
}
