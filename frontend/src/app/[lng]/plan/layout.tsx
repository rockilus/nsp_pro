import { languages } from "../../i18n/settings";
// MUI
import CssBaseline from "@mui/material/CssBaseline";
// Components
import NavAppBar from "../../../components/app-bar/nav-app-bar";
import ProtectedRoute from "../../../components/auth/protected-route";
// Context
import { TeamProvider } from "@/context/TeamProvider";
import { UserProvider } from "@/context/UserProvider";

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    lng: string;
  }>;
}) {
  const { lng } = await params;
  return (
    <ProtectedRoute requireAuth={true}>
      <UserProvider>
        <TeamProvider>
          <div style={{ overflow: "hidden", height: "100vh" }}>
            <CssBaseline />
            <header className="desktop-only-nav">
              <NavAppBar lng={lng} />
            </header>
            <main>{children}</main>
          </div>
        </TeamProvider>
      </UserProvider>
    </ProtectedRoute>
  );
}
