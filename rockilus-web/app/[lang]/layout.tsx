import type { Metadata } from "next";
import type { Locale } from "@/lib/dictionaries";
import { getDictionary } from "@/lib/dictionaries";
import HtmlLangSync from "./HtmlLangSync";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }, { lang: "es" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const title = dict.meta?.title ?? `Rockilus — ${dict.hero.headline}`;
  const description = dict.meta?.description ?? dict.hero.subheadline;
  const imageUrl =
    "https://rockilus-prod-public-assets.s3.eu-west-3.amazonaws.com/schedule-week-member.desktop.v1.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: dict.meta?.title ?? dict.hero.headline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      languages: {
        en: "/en",
        fr: "/fr",
        es: "/es",
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <>
      <HtmlLangSync lang={lang as Locale} />
      {children}
    </>
  );
}
