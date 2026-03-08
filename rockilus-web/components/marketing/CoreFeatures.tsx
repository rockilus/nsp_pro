interface Feature {
  title: string;
  description: string;
}

interface CoreFeaturesProps {
  features: Feature[];
}

function FeatureRow({
  feature,
  isReversed,
}: {
  feature: Feature;
  isReversed: boolean;
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
      <div className="aspect-video bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
        Feature Preview
      </div>
    </div>
  );
}

export default function CoreFeatures({ features }: CoreFeaturesProps) {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-white">
      <div className="mx-auto max-w-6xl space-y-20">
        {features.map((feature, i) => (
          <FeatureRow key={i} feature={feature} isReversed={i % 2 !== 0} />
        ))}
      </div>
    </section>
  );
}
