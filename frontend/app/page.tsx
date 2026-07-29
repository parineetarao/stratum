import StratumHero from '@/components/landing/StratumHero';
import ScrollRevealSection from '@/components/landing/ScrollRevealSection';
import StratumEngineSection from '@/components/landing/stratum-engine/StratumEngineSection';
import EngineWorkSection from '@/components/landing/engine-work/EngineWorkSection';
import EngineerControlSection from '@/components/landing/engineer-control/EngineerControlSection';
import FinalCTASection from '@/components/landing/final-cta/FinalCTASection';
import SiteFooter from '@/components/landing/final-cta/SiteFooter';

export default function LandingPage() {
  return (
    <div className="bg-[#020817] text-white min-h-screen overflow-x-hidden">
      <StratumHero />

      <ScrollRevealSection zIndex={2}>
        <StratumEngineSection />
      </ScrollRevealSection>

      <ScrollRevealSection zIndex={3}>
        <EngineWorkSection />
      </ScrollRevealSection>

      <ScrollRevealSection zIndex={4}>
        <EngineerControlSection />
      </ScrollRevealSection>

      <ScrollRevealSection zIndex={5}>
        <FinalCTASection />
      </ScrollRevealSection>

      <SiteFooter />
    </div>
  );
}
