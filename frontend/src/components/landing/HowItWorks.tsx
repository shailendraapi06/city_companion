import type { ReactNode } from 'react'
import { SectionHeading } from './SectionHeading'

interface Step {
  icon: ReactNode
  title: string
  description: string
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.7 1.9 1.9.7-1.9.7L19 20.2l-.7-1.9-1.9-.7 1.9-.7z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function DecideIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  )
}

const steps: Step[] = [
  {
    icon: <ChatIcon />,
    title: 'Tell us',
    description:
      'Describe what you need in plain words — a PG near your college, affordable food, a hospital nearby. No forms, no filters.',
  },
  {
    icon: <SparkIcon />,
    title: 'We understand',
    description:
      'We pick out your budget, your location and your must-haves, so nothing important gets missed.',
  },
  {
    icon: <SearchIcon />,
    title: 'We find',
    description:
      'We search verified places nearby and rank the best matches against exactly what you asked for.',
  },
  {
    icon: <DecideIcon />,
    title: 'You decide',
    description:
      'Compare match cards side by side, save the ones you like, and head straight there with directions.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="From “I need a place” to a plan in seconds"
          subtext="No forms, no filters, no scrolling through endless listings. Just a short conversation."
        />

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="anim-fade-up card-surface hover-lift p-6"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-1/10 text-accent-1">
                  {step.icon}
                </span>
                <span className="text-xs font-semibold tracking-widest text-text-tertiary">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
