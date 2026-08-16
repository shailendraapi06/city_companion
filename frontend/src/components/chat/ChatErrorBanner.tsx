interface ChatErrorBannerProps {
  onRetry: () => void
  onStartNewChat: () => void
}

/*
 * Chat-level generic error (UI_UX_Brief.md §7 / Frontend_Architecture.md §9):
 * "Something went wrong" + **Try Again** / **Start New Chat** — never the raw
 * technical error. Shown when the conversation transport reports a failure
 * (Phase 8 sets ChatContext.status='error'); in the mock flow no failure path
 * is reachable, but the surface is defined and tested now so the documented
 * state is never approximated later.
 */
export function ChatErrorBanner({ onRetry, onStartNewChat }: ChatErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-error/30 bg-error/10 px-4 py-4 text-center"
    >
      <p className="text-sm font-medium text-text-primary">Something went wrong.</p>
      <p className="mt-1 text-xs text-text-secondary">
        We couldn't get a response for that message.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onRetry} className="btn-secondary">
          Try Again
        </button>
        <button type="button" onClick={onStartNewChat} className="btn-ghost">
          Start New Chat
        </button>
      </div>
    </div>
  )
}
