'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/app/i18n/client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
// MUI
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
// Components
import NavigationHeader from '@/components/common/navigation-header';
// Context
import { useTeam } from '@/context/TeamContext';
// Hooks
import { useResponsiveSettings } from '@/hooks/useResponsiveSettings';
// Styles
import './team-settings-layout.css';

export default function TeamSettingsLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  const { t } = useTranslation(lng, 'teams-page');
  const { selectedTeam } = useTeam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, showNav, showContent, shouldRedirect } = useResponsiveSettings(lng);

  const teamId = selectedTeam?.team.id;

  // Redirect from base teams page to first child route when needed
  React.useEffect(() => {
    if (shouldRedirect && teamId) {
      router.push(`/${lng}/plan/teams/general?teamId=${teamId}`);
    }
  }, [shouldRedirect, lng, router, teamId]);

  // Security: Only render if team is selected
  if (!selectedTeam) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">No team selected</div>
      </div>
    );
  }

  // Back to teams selection
  const handleBackToTeams = () => {
    router.push(`/${lng}/plan/settings/teams`);
  };

  // Navigation links for team settings
  const teamLinks: { name: string; label: string; href: string }[] = [
    {
      name: 'general',
      label: t('general') || 'General',
      href: `/${lng}/plan/teams/general?teamId=${teamId}`,
    },
    {
      name: 'members',
      label: t('users') || 'Members',
      href: `/${lng}/plan/teams/members?teamId=${teamId}`,
    },
    {
      name: 'generation-settings',
      label: t('schedule_generation') || 'Schedule generation',
      href: `/${lng}/plan/teams/generation-settings?teamId=${teamId}`,
    },
  ];

  return (
    <div className="team-settings-layout">
      {/* Sidebar Navigation */}
      {showNav && (
        <div className="team-settings-sidebar">
          {/* Team Header with Back Navigation */}
          <div style={{ paddingLeft: '16px' }}>
            <NavigationHeader
              title={selectedTeam.team.name}
              onBack={handleBackToTeams}
              showBackButton={true}
            />
          </div>

          {/* Navigation List */}
          <List dense={true}>
            {teamLinks.map((link) => (
              <ListItem key={link.name} disablePadding>
                <ListItemButton
                  selected={pathname.includes(link.name)}
                  LinkComponent={Link}
                  href={link.href}
                >
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </div>
      )}

      {/* Content Area */}
      {showContent && <div className="team-settings-content">{children}</div>}
    </div>
  );
}
