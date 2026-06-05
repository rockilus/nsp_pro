import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../components/auth/auth-provider';
import ThemeRegistry from '../components/providers/ThemeRegistry';
import ThemeProvider from '../components/providers/ThemeProvider';
// Components
import ImpersonationBanner from '../components/app-bar/impersonation-banner';
import { Toaster } from '../components/ui/sonner';
import { TooltipProvider } from '../components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Rockilus',
  description: 'Planning made easy',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ThemeRegistry>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>
              <TooltipProvider>
                <ImpersonationBanner />
                {children}
                <Toaster />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </ThemeRegistry>
    </html>
  );
}
