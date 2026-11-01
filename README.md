# work-bar

A Claude Code mod that shows a "Working" progress bar above the prompt while a turn is running.

- **With a task list:** when Claude keeps a task list for multi-step work (`TodoWrite`, or the desktop app's plan list), the bar shows a step-based percent: `Working ████████░░░░░░░░░░░░░░░░ 33% (2/6) 42s · current step`.
- **Without a task list:** quick questions get a sweeping block and an elapsed-time counter, with no percent, because no honest percent exists without a plan.
- The bar appears only while a turn is running, and the plan resets at the start of every turn.
- It only watches task-list updates. If anything inside the mod fails, the real tool call is never blocked.

The percent is finished steps out of total steps. It is not a time estimate.

## Install

At the prompt of a terminal session:

```
/plugin install work-bar --marketplace cosmic-tom13/work-bar
```

From a shell:

```
claude plugin install work-bar --marketplace cosmic-tom13/work-bar
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `cosmic-tom13/work-bar`, then Add plugin.

When asked `Add marketplace?`, answer `y`, then choose a scope (user scope keeps it on in every session). The mod is active right after install.

## Notes

- The bar is drawn in the band above the prompt, which the docs say renders on the terminal and desktop surfaces.
- Source: `hooks/register.tsx`. State types: `types/index.d.ts`.

## License

MIT
