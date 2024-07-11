import { languages } from "../../i18n/settings";
// Components
import NavAppBarAuth from "../../../components/user-authentication/nav-app-bar-auth";

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
        <NavAppBarAuth lng={lng} />
      </header>
      <main>{children}</main>
    </>
  );
}
