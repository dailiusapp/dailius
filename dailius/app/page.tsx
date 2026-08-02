import { FAQ } from "@/components/landing/FAQ";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Philosophy } from "@/components/landing/Philosophy";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SocialProof } from "@/components/landing/SocialProof";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <ProblemSection />
      <Features />
      <HowItWorks />
      <Philosophy />
      <SocialProof />
      <FAQ />
    </main>
  );
}
