// Force static export for this page
export const dynamic = "force-static";

import { redirect } from "next/navigation";
import { fallbackLng, languages } from "@/app/i18n/settings";

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  // Await params — required in Next.js 15 where params is a Promise.
  const { lng } = await params;

  // Failsafe: if lng is somehow still undefined (e.g. unexpected runtime
  // condition), fall back to the canonical default language so we never
  // redirect to /undefined/plan/schedule and cause an infinite loop.
  const resolvedLng = lng || fallbackLng;

  redirect(`/${resolvedLng}/plan/schedule`);
}
