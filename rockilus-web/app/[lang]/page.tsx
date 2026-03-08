import { getDictionary, type Locale } from "@/lib/dictionaries";
import NavBar from "@/components/marketing/NavBar";
import HeroSection from "@/components/marketing/HeroSection";
import ProblemSolution from "@/components/marketing/ProblemSolution";
import CoreFeatures from "@/components/marketing/CoreFeatures";
import HowItWorks from "@/components/marketing/HowItWorks";
import FinalCTA from "@/components/marketing/FinalCTA";
import Footer from "@/components/marketing/Footer";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  return (
    <main>
      <NavBar nav={dict.nav} lang={lang as Locale} />
      <HeroSection hero={dict.hero} />
      <ProblemSolution problem={dict.problem} solution={dict.solution} />
      <CoreFeatures features={dict.features} />
      <HowItWorks howItWorks={dict.howItWorks} />
      <FinalCTA finalCta={dict.finalCta} />
      <Footer footer={dict.footer} lang={lang as Locale} />
    </main>
  );
}
