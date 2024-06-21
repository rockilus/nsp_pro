import Link from "next/link";
import { languages, fallbackLng } from "@/app/i18n/settings";
import { useTranslation } from "@/app/i18n";
import { Footer } from "@/app/[lng]/components/Footer";

export default async function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  if (languages.indexOf(lng) < 0) lng = fallbackLng;
  const { t } = await useTranslation(lng);

  return (
    <>
      <h1>{t("title")}</h1>
      <Link href={`/${lng}`}>{t("back-to-home")}</Link>
      <Footer lng={lng} />
    </>
  );
}
