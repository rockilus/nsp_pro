// Force static export for this page
export const dynamic = "force-static";

import { redirect } from "next/navigation";

interface HomePageProps {
  params: { lng: string };
}

export async function generateStaticParams() {
  const languages = ["en", "pt", "es", "fr"];

  return languages.map((lng) => ({
    lng,
  }));
}

export default function Home({ params }: HomePageProps) {
  // Server-side redirect straight to the schedule page for the current language.
  // This ensures the language root (`/[lng]/`) immediately resolves to the
  // app's main schedule view and is compatible with static export.
  redirect(`/${params.lng}/plan/schedule`);
}
