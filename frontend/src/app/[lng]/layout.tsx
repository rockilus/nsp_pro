import "../globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { notFound } from "next/navigation";
// Components
import { LanguageProvider } from "../../components/providers/LanguageProvider";
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

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const resolvedParams = await params;
  const lng = resolvedParams.lng;

  // Validate language parameter
  if (!languages.includes(lng)) {
    notFound();
  }

  // Only the root layout (src/app/layout.tsx) must render <html> and <body>.
  // Child layouts should return elements that can be nested inside the root body.
  return <LanguageProvider initialLanguage={lng}>{children}</LanguageProvider>;
}
