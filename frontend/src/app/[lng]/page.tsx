// Components
import { HomePageClient } from "../../components/home-client";

// Force static export for this page
export const dynamic = "force-static";

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
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <HomePageClient lng={params.lng} />
    </main>
  );
}
