import { Users, Settings, Zap, Share2 } from "lucide-react";
import type { ElementType } from "react";

const ICONS: ElementType[] = [Users, Settings, Zap, Share2];

interface HowItWorksProps {
  howItWorks: {
    title: string;
    steps: Array<{ title: string; description: string }>;
  };
}

export default function HowItWorks({ howItWorks }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-14">
          {howItWorks.title}
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {howItWorks.steps.map((step, i) => {
            const Icon = ICONS[i] ?? Zap;
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center space-y-3"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg">
                  {i + 1}
                </div>
                <Icon className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
