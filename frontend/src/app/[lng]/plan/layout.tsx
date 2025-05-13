import { languages } from "../../i18n/settings";
// MUI
import CssBaseline from "@mui/material/CssBaseline";
// Components
import NavAppBar from "../../../components/app-bar/nav-app-bar";
import SessionHandler from "../../../components/session-handler";
// Context
import { TeamProvider } from "@/context/TeamProvider";
import { UserProvider } from "@/context/UserProvider";

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
      <UserProvider>
        <TeamProvider>
          <div style={{ overflow: "hidden", height: "100vh" }}>
            <CssBaseline />
            <header>
              <NavAppBar lng={lng} />
            </header>
            <main>{children}</main>
          </div>
        </TeamProvider>
      </UserProvider>
    </SessionHandler>
  );
}
