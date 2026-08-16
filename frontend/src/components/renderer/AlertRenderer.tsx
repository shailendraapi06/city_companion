import type { ReactNode } from 'react'
import { asString } from '../../lib/blockUtils'
import type { AlertLevel, Block } from '../../types'

const levelConfig: Record<AlertLevel, { label: string; border: string; text: string; iconBg: string }> = {
  info: { label: 'Info', border: 'border-info/40', text: 'text-info', iconBg: 'bg-info/10' },
  success: { label: 'Success', border: 'border-success/40', text: 'text-success', iconBg: 'bg-success/10' },
  warning: { label: 'Warning', border: 'border-warning/40', text: 'text-warning', iconBg: 'bg-warning/10' },
  error: { label: 'Error', border: 'border-error/40', text: 'text-error', iconBg: 'bg-error/10' },
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </svg>
  )
}

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}

const levelIcons: Record<AlertLevel, ReactNode> = {
  info: <InfoIcon />,
  success: <SuccessIcon />,
  warning: <WarningIcon />,
  error: <ErrorIcon />,
}

interface AlertRendererProps {
  block: Block
}

export function AlertRenderer({ block }: AlertRendererProps) {
  const level: AlertLevel =
    block.level === 'info' || block.level === 'success' || block.level === 'warning' || block.level === 'error'
      ? block.level
      : 'info'
  const config = levelConfig[level]
  const content = asString(block.content)
  const title = asString(block.title) || config.label

  if (!content.trim() && !title) return null

  return (
    <div className={`my-2 flex items-start gap-3 rounded-xl border ${config.border} ${config.iconBg} p-4`}>
      <span className={`mt-0.5 shrink-0 ${config.text}`} aria-hidden="true">
        {levelIcons[level]}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {content ? <p className="mt-1 text-sm leading-relaxed text-text-secondary">{content}</p> : null}
      </div>
    </div>
  )
}
