import "../globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { notFound } from "next/navigation";
// Components
import { LanguageProvider } from "../../components/providers/LanguageProvider";
// import ImpersonationBanner from "../../components/app-bar/impersonation-banner";
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
  params: Promise<{ lng: string }>;
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  // `params` can be a Promise in newer Next.js route handlers — await it first.
  const resolvedParams = await params;
  const lng = resolvedParams.lng;

  // Validate language parameter
  if (!languages.includes(lng)) {
    notFound();
  }

  return (
    <html lang={lng}>
      <AppRouterCacheProvider>
        <body className={inter.className}>
          <LanguageProvider initialLanguage={lng}>
            {/* <ImpersonationBanner /> */}
            {children}
          </LanguageProvider>
        </body>
      </AppRouterCacheProvider>
    </html>
  );
}
