import { SectionHeading } from './SectionHeading'

interface DemoPlace {
  rank: string
  featured: boolean
  name: string
  price: number
  rating: number
  distance: string
  why: string[]
  updated: string
}

const places: DemoPlace[] = [
  {
    rank: '#1 Best match',
    featured: true,
    name: 'Shyam PG & Mess',
    price: 7500,
    rating: 4.3,
    distance: '0.8 km',
    why: ['Fits your ₹8,000 budget', 'Food included in the rent', '0.8 km from Kanpur College'],
    updated: 'Verified listing · Updated 2 days ago',
  },
  {
    rank: '#2',
    featured: false,
    name: 'Green Residency PG',
    price: 7800,
    rating: 4.1,
    distance: '1.2 km',
    why: ['Within budget', 'Food included', 'Highly rated by students'],
    updated: 'Verified listing · Updated 5 days ago',
  },
  {
    rank: '#3',
    featured: false,
    name: 'Swastik Boys PG',
    price: 6500,
    rating: 3.9,
    distance: '2.1 km',
    why: ['Cheapest option in range', 'Food included', 'Direct bus to college'],
    updated: 'Verified listing · Updated 1 week ago',
  },
]

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  )
}

function UserBubble({ children }: { children: string }) {
  return (
    <div className="anim-fade-up ml-auto flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
      <span className="text-xs font-medium text-text-tertiary">You</span>
      <div className="rounded-2xl rounded-br-md bg-accent-1/15 px-4 py-3 text-sm leading-relaxed text-text-primary">
        {children}
      </div>
    </div>
  )
}

function DemoPlaceCard({ place }: { place: DemoPlace }) {
  return (
    <article className="rounded-xl border border-border bg-bg-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={
              place.featured
                ? 'inline-flex items-center rounded-full bg-linear-to-r from-accent-1 to-accent-2 px-2.5 py-0.5 text-xs font-bold text-[#081018]'
                : 'inline-flex items-center rounded-full border border-border-strong bg-bg-2 px-2.5 py-0.5 text-xs font-semibold text-text-secondary'
            }
          >
            {place.rank}
          </span>
          <h4 className="mt-2 truncate text-sm font-semibold text-text-primary">{place.name}</h4>
        </div>
        <p className="shrink-0 text-sm font-bold text-text-primary">
          ₹{place.price.toLocaleString('en-IN')}
          <span className="font-normal text-text-tertiary">/mo</span>
        </p>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
        <span aria-hidden="true">★</span>
        <span>{place.rating}</span>
        <span aria-hidden="true">·</span>
        <span>{place.distance} away</span>
        <span aria-hidden="true">·</span>
        <span>PG · Food included</span>
      </p>

      <ul className="mt-3 space-y-1.5">
        {place.why.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
            <svg
              className="mt-0.5 shrink-0 text-success"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {['View details', 'Directions', 'Call', 'Save'].map((action) => (
          <span
            key={action}
            className="rounded-full border border-border bg-bg-2 px-2.5 py-1 text-xs font-medium text-text-secondary"
          >
            {action}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-text-tertiary">{place.updated}</p>
    </article>
  )
}

function AssistantMessage({ delay }: { delay: number }) {
  return (
    <div
      className="anim-fade-up mr-auto flex w-full max-w-[95%] flex-col gap-2 sm:max-w-[90%]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-accent-1 to-accent-2 text-xs font-extrabold text-[#081018]">
          CC
        </span>
        <span className="text-xs font-medium text-text-tertiary">City Companion</span>
      </div>
      <div className="w-full space-y-4 rounded-2xl rounded-tl-md border border-border bg-bg-2/60 p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Here are 3 good matches for you</h3>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            For a PG within ₹8,000 with food included, near Kanpur College, these stood out:
          </p>
        </div>

        {places.map((place) => (
          <DemoPlaceCard key={place.name} place={place} />
        ))}

        <p className="text-sm leading-relaxed text-text-secondary">
          Want something cheaper, or closer to college? Just ask — one message is enough.
        </p>
      </div>
    </div>
  )
}

export function LiveDemoConversation() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Live example"
          title="This is what an answer actually looks like"
          subtext="A quick, real conversation — results come back as scannable cards you can act on, not a wall of text."
        />

        <div className="anim-fade-up mt-12 overflow-hidden rounded-2xl border border-border-strong bg-bg-1 shadow-glow">
          <div className="flex items-center justify-between border-b border-border bg-bg-2/60 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-1/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent-2/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-bg-3" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <PinIcon />
              Kanpur
            </div>
            <span className="rounded-full border border-border bg-bg-2 px-2.5 py-0.5 text-xs font-medium text-text-tertiary">
              Live demo
            </span>
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            <UserBubble>
              I'm moving to Kanpur next week. Can you find a PG near Kanpur College, under ₹8,000 a
              month, with food included?
            </UserBubble>
            <AssistantMessage delay={400} />
          </div>
        </div>
      </div>
    </section>
  )
}
