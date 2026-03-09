import { CheckCircle } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";

interface PricingSectionProps {
  pricing: Dictionary["pricing"];
}

export default function PricingSection({ pricing }: PricingSectionProps) {
  return (
    <section className="bg-white py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left column — mission text */}
        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            {pricing.mission_headline}
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            {pricing.mission_description}
          </p>
        </div>

        {/* Right column — pricing card */}
        <div className="border border-blue-200 bg-blue-50 rounded-2xl p-8 shadow-2xl">
          {/* Badge */}
          <span className="inline-block bg-blue-600 text-white text-sm font-semibold rounded-full px-4 py-1 mb-6">
            {pricing.card_title}
          </span>

          {/* Price */}
          <div className="flex items-end gap-2 mb-8">
            <span className="text-6xl font-bold text-slate-900 leading-none">
              {pricing.card_price}
            </span>
            <span className="text-lg text-slate-500 mb-1">
              {pricing.card_period}
            </span>
          </div>

          {/* Feature list */}
          <ul className="space-y-4 mb-8">
            {pricing.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA button */}
          <a
            href="#"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md py-3 transition-colors"
          >
            {pricing.cta_button}
          </a>
        </div>
      </div>
    </section>
  );
}
