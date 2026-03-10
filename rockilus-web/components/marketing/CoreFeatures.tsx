import type { Locale } from "@/lib/dictionaries";
import FeatureImage from "./FeatureImage";

interface Feature {
  title: string;
  description: string;
}

interface CoreFeaturesProps {
  features: Feature[];
  lang: Locale;
}

function FeatureRow({
  feature,
  isReversed,
  imageName,
  lang,
}: {
  feature: Feature;
  isReversed: boolean;
  imageName: string;
  lang: Locale;
}) {
  return (
    <div
      className={`grid md:grid-cols-2 gap-12 items-center ${
        isReversed ? "md:[&>:first-child]:order-last" : ""
      }`}
    >
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-900">{feature.title}</h3>
        <p className="text-slate-600 leading-relaxed">{feature.description}</p>
      </div>
      <FeatureImage locale={lang} name={imageName} alt={feature.title} />
    </div>
  );
}

export default function CoreFeatures({ features, lang }: CoreFeaturesProps) {
  const IMAGE_FILES = [
    "new-rule.desktop.v1.png",
    "schedule-month-member.desktop.v1.png",
    "request-calendar.desktop.v1.png",
    "replacement.desktop.v1.png",
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-white">
      <div className="mx-auto max-w-6xl space-y-20">
        {features.map((feature, i) => (
          <FeatureRow
            key={i}
            feature={feature}
            isReversed={i % 2 !== 0}
            imageName={IMAGE_FILES[i] ?? IMAGE_FILES[0]}
            lang={lang}
          />
        ))}
      </div>
    </section>
  );
}
