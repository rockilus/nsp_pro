import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
// Components
import { SuperTokensProvider } from "../components/supertokensProvider";
import { TeamProvider } from "@/context/TeamProvider";
import ImpersonationBanner from "../components/app-bar/impersonation-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rockilus",
  description: "Planning made easy",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SuperTokensProvider>
        <AppRouterCacheProvider>
          <TeamProvider>
            <body className={inter.className}>
              <ImpersonationBanner />
              {children}
            </body>
          </TeamProvider>
        </AppRouterCacheProvider>
      </SuperTokensProvider>
    </html>
  );
}
