import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
// Components
import { SuperTokensProvider } from "../components/supertokensProvider";
import { TeamStoreProvider } from "../providers/team-store-provider";
import ImpersonationBanner from "../components/app-bar/impersonation-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rockilus",
  description: "Planning made easy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SuperTokensProvider>
        <AppRouterCacheProvider>
          <TeamStoreProvider>
            <body className={inter.className}>
              <ImpersonationBanner />
              {children}
            </body>
          </TeamStoreProvider>
        </AppRouterCacheProvider>
      </SuperTokensProvider>
    </html>
  );
}
