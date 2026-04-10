import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../components/auth/auth-provider';
import ThemeRegistry from '../components/providers/ThemeRegistry';
// Components
import ImpersonationBanner from '../components/app-bar/impersonation-banner';
import { Toaster } from '../components/ui/sonner';

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
    <html lang="en">
      <ThemeRegistry>
        <body className={inter.className}>
          <AuthProvider>
            <ImpersonationBanner />
            {children}
            <Toaster />
          </AuthProvider>
        </body>
      </ThemeRegistry>
    </html>
  );
}
