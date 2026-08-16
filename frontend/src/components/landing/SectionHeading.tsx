interface SectionHeadingProps {
  eyebrow: string
  title: string
  subtext?: string
}

export function SectionHeading({ eyebrow, title, subtext }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-1">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{title}</h2>
      {subtext ? <p className="mt-4 text-base text-text-secondary sm:text-lg">{subtext}</p> : null}
    </div>
  )
}
