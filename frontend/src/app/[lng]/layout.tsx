import "../globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { notFound } from "next/navigation";
// Components
import { SuperTokensProvider } from "../../components/supertokensProvider";
import { LanguageProvider } from "../../components/providers/LanguageProvider";
import ImpersonationBanner from "../../components/app-bar/impersonation-banner";
import { languages } from "../i18n/settings";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rockilus",
  description: "Planning made easy",
};

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: { lng: string };
}

export default function RootLayout({ children, params }: RootLayoutProps) {
  // Validate language parameter
  if (!languages.includes(params.lng)) {
    notFound();
  }

  return (
    <html lang={params.lng}>
      <SuperTokensProvider>
        <AppRouterCacheProvider>
          <body className={inter.className}>
            <LanguageProvider initialLanguage={params.lng}>
              <ImpersonationBanner />
              {children}
            </LanguageProvider>
          </body>
        </AppRouterCacheProvider>
      </SuperTokensProvider>
    </html>
  );
}
