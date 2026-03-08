interface FinalCTAProps {
  finalCta: {
    heading: string;
    subheadline: string;
    button: string;
  };
}

export default function FinalCTA({ finalCta }: FinalCTAProps) {
  return (
    <section id="cta" className="py-24 px-4 sm:px-6 bg-blue-50">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {finalCta.heading}
        </h2>
        <p className="text-lg text-slate-600">{finalCta.subheadline}</p>
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-8 py-4 text-white font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          {finalCta.button}
        </a>
      </div>
    </section>
  );
}
