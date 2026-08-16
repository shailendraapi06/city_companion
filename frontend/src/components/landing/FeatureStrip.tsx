import type { ReactNode } from 'react'

interface Feature {
  icon: ReactNode
  label: string
  description: string
}

function BudgetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h2" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  )
}

const features: Feature[] = [
  {
    icon: <BudgetIcon />,
    label: 'Budget-aware',
    description: 'Finds places that actually fit what you can spend.',
  },
  {
    icon: <PinIcon />,
    label: 'Location-aware',
    description: 'Knows where you are and how far everything is.',
  },
  {
    icon: <PersonIcon />,
    label: 'Personalized',
    description: 'Built around your must-haves, not generic lists.',
  },
  {
    icon: <BoltIcon />,
    label: 'Actionable',
    description: 'Directions, calls and details right in the chat.',
  },
]

export function FeatureStrip() {
  return (
    <section className="border-t border-border py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <li
              key={feature.label}
              className="anim-fade-up flex flex-col items-center gap-2 text-center"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg-2 text-accent-1">
                {feature.icon}
              </span>
              <p className="text-sm font-semibold text-text-primary">{feature.label}</p>
              <p className="max-w-[14rem] text-xs leading-relaxed text-text-tertiary">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
