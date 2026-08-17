import type { ThinkingStage } from '../../types'

export const THINKING_STAGES: { key: ThinkingStage; label: string }[] = [
  { key: 'understanding', label: 'Understanding your request' },
  { key: 'finding', label: 'Finding nearby options' },
  { key: 'ranking', label: 'Ranking the best matches' },
  { key: 'finalizing', label: 'Preparing your answer' },
]

interface ThinkingIndicatorProps {
  /*
   * The current backend stage (UI_UX_Brief.md §6.1). This component NEVER
   * advances on its own — it reflects the stage it is given. ChatContext
   * sets the stage from real POST /api/chat/ transport events, so no
   * consumer-side progress is ever fabricated.
   */
  stage?: ThinkingStage | null
}

/*
 * UI_UX_Brief.md §6.1 — a status stepper that reflects real backend stages.
 * The active stage pulses (shared `anim-pulse`, subtle on the chat surface and
 * killed globally by the prefers-reduced-motion rule in theme.css); completed
 * stages read as done. The full path stays visible so the user sees honest
 * progress rather than a meaningless spinner.
 */
export function ThinkingIndicator({ stage }: ThinkingIndicatorProps) {
  const currentIndex = Math.max(0, THINKING_STAGES.findIndex((s) => s.key === stage))

  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-text-tertiary">
      {THINKING_STAGES.map(({ key, label }, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'upcoming'
        return (
          <span key={key} className="flex items-center gap-1.5" data-stage={key} data-stage-state={state}>
            {index > 0 ? <span aria-hidden="true">→</span> : null}
            {state === 'active' ? (
              <span aria-hidden="true" className="anim-pulse h-1.5 w-1.5 rounded-full bg-accent-1" />
            ) : null}
            <span
              className={
                state === 'active'
                  ? 'font-medium text-text-primary'
                  : state === 'done'
                    ? 'text-text-tertiary'
                    : 'text-text-tertiary/70'
              }
            >
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
