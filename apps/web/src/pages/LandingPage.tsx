import { Hero, HeroTrustStrip } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { WhyZeroGSection } from "@/components/landing/WhyZeroG";
import { StoryHowItWorks } from "@/components/landing/StoryHowItWorks";
import { ProtectionStory } from "@/components/landing/ProtectionStory";
import {
  ContractsSection,
  FinalCta,
  Footer,
  LiveProofSection,
  ManifestoQuote,
  WhatIsBeacon,
} from "@/components/landing/Sections";

export function LandingPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden bg-paper">
      <Navbar />
      <Hero />
      <HeroTrustStrip />
      <ManifestoQuote />
      <WhatIsBeacon />
      <LiveProofSection />
      <StoryHowItWorks />
      <ProtectionStory />
      <WhyZeroGSection />
      <ContractsSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
