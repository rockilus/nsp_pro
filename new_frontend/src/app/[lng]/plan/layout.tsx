import { languages } from "@/app/i18n/settings";
// Components
import NavAppBar from "@/components/app-bar/nav-app-bar";

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default function Layout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  return (
    <>
      <header>
        <NavAppBar lng={lng} />
      </header>
      <main>{children}</main>
    </>
  );
  //   return <p>Dashboard Page</p>;
}
