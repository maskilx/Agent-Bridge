import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { DiscoverySection } from "@/components/landing/DiscoverySection";
import { WorkspacesSection } from "@/components/landing/WorkspacesSection";
import { EfficiencySection } from "@/components/landing/EfficiencySection";
import { TrustSection } from "@/components/landing/TrustSection";
import { SessionsSection } from "@/components/landing/SessionsSection";
import { ExampleSection } from "@/components/landing/ExampleSection";
import { EcosystemSection } from "@/components/landing/EcosystemSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]"
      style={{
        backgroundImage:
          "radial-gradient(60rem 36rem at 50% 0%, var(--glow), transparent 70%)," +
          "radial-gradient(50rem 30rem at 100% 28%, var(--glow), transparent 72%)," +
          "radial-gradient(50rem 30rem at 0% 55%, var(--glow), transparent 72%)," +
          "radial-gradient(54rem 32rem at 100% 80%, var(--glow), transparent 72%)," +
          "radial-gradient(60rem 36rem at 50% 100%, var(--glow), transparent 70%)",
      }}
    >
      <Navbar />
      <HeroSection />
      <PillarsSection />
      <DiscoverySection />
      <WorkspacesSection />
      <EfficiencySection />
      <TrustSection />
      <SessionsSection />
      <ExampleSection />
      <EcosystemSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
