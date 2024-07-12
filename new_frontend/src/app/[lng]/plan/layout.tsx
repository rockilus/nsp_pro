import { languages } from "../../i18n/settings";
// MUI
import CssBaseline from "@mui/material/CssBaseline";
// Components
import NavAppBar from "../../../components/app-bar/nav-app-bar";
import SessionHandler from "../../../components/session-handler";

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
    <SessionHandler>
      <>
        <CssBaseline />
        <header>
          <NavAppBar lng={lng} />
        </header>
        <main>{children}</main>
      </>
    </SessionHandler>
  );
}
