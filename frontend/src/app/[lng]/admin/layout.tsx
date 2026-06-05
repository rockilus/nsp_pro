import { languages } from '../../i18n/settings';
// Components
import NavAppBar from '@/components/app-bar/nav-app-bar';
import AdminLayout from '@/components/admin/admin-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import SuperAdminGuard from '@/components/admin/super-admin-guard';
// Context
import { TeamProvider } from '@/context/TeamProvider';
import { UserProvider } from '@/context/UserProvider';
import React from 'react';

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;

  return (
    <ProtectedRoute requireAuth={true}>
      <UserProvider>
        <TeamProvider>
          <div style={{ overflow: 'hidden', height: '100vh' }}>
            <header className="desktop-only-nav">
              <NavAppBar lng={lng} />
            </header>
            <main>
              <SuperAdminGuard lng={lng}>
                <AdminLayout params={{ lng }}>{children}</AdminLayout>
              </SuperAdminGuard>
            </main>
          </div>
        </TeamProvider>
      </UserProvider>
    </ProtectedRoute>
  );
}
