'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { getSettingsLinks } from './settings-links';
import React from 'react';
// MUI
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
// Hooks
import { useResponsiveSettings } from '@/hooks/useResponsiveSettings';
import { useIsMobile, useIsLandscape } from '@/hooks/useIsMobile';
// Components
import NavigationHeader from '@/components/common/navigation-header';
// Styles
import './settings-layout.css';

export default function SettingsLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  const { t } = useTranslation(lng, 'profile-page');
  const { t: tAppBar } = useTranslation(lng, 'app-bar');

  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const { showNav, showContent, shouldRedirect } = useResponsiveSettings(lng);

  const links = getSettingsLinks(lng, t, tAppBar);

  // Redirect from base settings page to first child route when needed
  React.useEffect(() => {
    if (shouldRedirect) {
      router.push(`/${lng}/plan/settings/personal-info`);
    }
  }, [shouldRedirect, lng, router]);

  return (
    <div className="settings-layout">
      {/* Sidebar Menu */}
      {showNav && (
        <>
          {isMobile && !isLandscape && (
            <div style={{ paddingLeft: '16px' }}>
              <NavigationHeader title={t('settings')} showBackButton={false} />
            </div>
          )}
          <List
            dense={true}
            sx={{
              width: isMobile && !isLandscape ? '100%' : '20%',
              maxWidth: isMobile && !isLandscape ? 'none' : 360,
            }}
            className="settings-sidebar"
          >
            {links.map((link) => (
              <ListItemButton
                key={link.name}
                selected={pathname.includes(link.name)}
                LinkComponent={Link}
                href={link.href}
              >
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}

      {/* Content Area */}
      {showContent && <div className="settings-content">{children}</div>}
    </div>
  );
}
