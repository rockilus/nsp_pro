interface HeroProps {
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
}

export default function HeroSection({ hero }: HeroProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 bg-white">
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            {hero.headline}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {hero.subheadline}
          </p>
          <a
            href="#cta"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {hero.cta}
          </a>
        </div>
        <div className="aspect-video bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
          Dashboard Preview
        </div>
      </div>
    </section>
  );
}
