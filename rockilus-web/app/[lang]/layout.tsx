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
  return {
    title: `Rockilus — ${dict.hero.headline}`,
    description: dict.hero.subheadline,
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
