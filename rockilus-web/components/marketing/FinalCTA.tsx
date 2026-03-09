interface FinalCTAProps {
  finalCta: {
    headline: string;
    subheadline: string;
    button_primary: string;
    button_secondary: string;
    microcopy?: string;
  };
}

export default function FinalCTA({ finalCta }: FinalCTAProps) {
  return (
    <section id="cta" className="py-24 px-4 sm:px-6 bg-blue-50">
      <div className="mx-auto max-w-3xl text-center">
        <div className="space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {finalCta.headline}
          </h2>
          <p className="text-lg text-slate-600">{finalCta.subheadline}</p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 border border-blue-600 px-6 py-2.5 text-white font-semibold hover:bg-blue-700 transition-colors text-sm w-48"
          >
            {finalCta.button_primary}
          </a>

          <a
            href="#"
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-6 py-2.5 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm w-48"
          >
            {finalCta.button_secondary}
          </a>
        </div>

        {finalCta.microcopy ? (
          <p className="text-xs text-slate-500 mt-3">{finalCta.microcopy}</p>
        ) : null}
      </div>
    </section>
  );
}
