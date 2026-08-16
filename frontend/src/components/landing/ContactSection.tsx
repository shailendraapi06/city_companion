import { SectionHeading } from './SectionHeading'

export function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
        <SectionHeading
          eyebrow="Contact"
          title="Found something out of date? Tell us"
          subtext="We're just getting started — real feedback from real people is what makes City Companion better for your city."
        />
        <a href="mailto:hello@citycompanion.app" className="btn-secondary mt-8 px-6 py-3 text-sm">
          hello@citycompanion.app
        </a>
      </div>
    </section>
  )
}
