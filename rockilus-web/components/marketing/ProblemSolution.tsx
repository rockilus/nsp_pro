import { CheckCircle, XCircle } from "lucide-react";

interface ProblemSolutionProps {
  headline: string;
  problem: { title: string; points: string[] };
  solution: { title: string; points: string[] };
}

export default function ProblemSolution({
  headline,
  problem,
  solution,
}: ProblemSolutionProps) {
  return (
    <section className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="mx-auto max-w-6xl mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center">
          {headline}
        </h1>
      </div>

      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10">
        <div className="border border-slate-200 rounded-lg p-8 bg-white">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {problem.title}
          </h2>
          <ul className="space-y-3">
            {problem.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-blue-200 rounded-lg p-8 bg-blue-50">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">
            {solution.title}
          </h2>
          <ul className="space-y-3">
            {solution.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
