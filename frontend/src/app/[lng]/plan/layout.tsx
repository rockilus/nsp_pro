import { languages } from '../../i18n/settings';
// MUI
import CssBaseline from '@mui/material/CssBaseline';
// Components
import NavAppBar from '../../../components/app-bar/nav-app-bar';
import ProtectedRoute from '../../../components/auth/protected-route';
// Context
import { TeamProvider } from '@/context/TeamProvider';
import { UserProvider } from '@/context/UserProvider';
import { CopilotProvider } from '@/context/CopilotContext';
import { CopilotPanel } from '@/components/copilot/copilot-panel';
import { env } from '@/config/env';

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

  const content = (
    <div style={{ overflow: 'hidden', height: '100vh' }}>
      <CssBaseline />
      <header className="desktop-only-nav">
        <NavAppBar lng={lng} />
      </header>
      <main>{children}</main>
    </div>
  );

  return (
    <ProtectedRoute requireAuth={true}>
      <UserProvider>
        <TeamProvider>
          {env.copilotEnabled ? (
            <CopilotProvider>
              {content}
              <CopilotPanel lng={lng} />
            </CopilotProvider>
          ) : (
            content
          )}
        </TeamProvider>
      </UserProvider>
    </ProtectedRoute>
  );
}
