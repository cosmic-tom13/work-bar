export type StepStatus = 'pending' | 'in_progress' | 'completed'
export type Step = { content: string; status: StepStatus }

declare module 'claude-code' {
  interface PluginState {
    'work-bar': { steps: Step[]; startedAt: number; now: number }
  }
}
