import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { AuthProvider } from "../components/auth/auth-provider";
// Components
// import ImpersonationBanner from "../components/app-bar/impersonation-banner";

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
      <AppRouterCacheProvider>
        <body className={inter.className}>
          <AuthProvider>
            {/* <ImpersonationBanner /> */}
            {children}
          </AuthProvider>
        </body>
      </AppRouterCacheProvider>
    </html>
  );
}
