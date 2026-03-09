import { getDictionary, type Locale } from "@/lib/dictionaries";
import NavBar from "@/components/marketing/NavBar";
import HeroSection from "@/components/marketing/HeroSection";
import ProblemSolution from "@/components/marketing/ProblemSolution";
import CoreFeatures from "@/components/marketing/CoreFeatures";
import HowItWorks from "@/components/marketing/HowItWorks";
import PricingSection from "@/components/marketing/PricingSection";
import FinalCTA from "@/components/marketing/FinalCTA";
import Footer from "@/components/marketing/Footer";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // Build single canonical app URL and pass it to child components
  const appUrl = `https://app.rockilus.com/${lang}/plan/schedule/`;
  const dict = await getDictionary(lang as Locale);
  const demoMailto = `mailto:felipe.kharaba@rockilus.com?subject=${encodeURIComponent(
    dict.demoMailto.subject,
  )}&body=${encodeURIComponent(dict.demoMailto.body)}`;

  return (
    <main>
      <NavBar nav={dict.nav} lang={lang as Locale} appUrl={appUrl} />
      <HeroSection
        hero={dict.hero}
        lang={lang as Locale}
        microcopy={dict.finalCta.microcopy}
        appUrl={appUrl}
        demoMailto={demoMailto}
      />
      <ProblemSolution
        headline={dict.problemVsSolution.headline}
        problem={dict.problemVsSolution.problem}
        solution={dict.problemVsSolution.solution}
      />
      <CoreFeatures features={dict.features} />
      <HowItWorks howItWorks={dict.howItWorks} />
      <PricingSection
        pricing={dict.pricing}
        appUrl={appUrl}
        sectionLabel={dict.nav.pricing}
      />
      <FinalCTA
        finalCta={dict.finalCta}
        appUrl={appUrl}
        demoMailto={demoMailto}
      />
      <Footer footer={dict.footer} lang={lang as Locale} />
    </main>
  );
}
