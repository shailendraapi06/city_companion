import { ContactSection } from '../../components/landing/ContactSection'
import { FeatureStrip } from '../../components/landing/FeatureStrip'
import { Hero } from '../../components/landing/Hero'
import { HowItWorks } from '../../components/landing/HowItWorks'
import { LiveDemoConversation } from '../../components/landing/LiveDemoConversation'

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <HowItWorks />
      <LiveDemoConversation />
      <FeatureStrip />
      <ContactSection />
    </div>
  )
}
