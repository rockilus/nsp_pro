'use client';

import React from 'react';
import { TeamContext } from './TeamContext';
import { useTeamSelector } from '@/hooks/useTeamSelector';
import { usePathname, useRouter } from 'next/navigation';

export function TeamProvider({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const {
    teams,
    selectedTeam,
    selectedTeamId,
    setSelectedTeamId,
    loading,
    updateTeamInContext,
    addTeamToContext,
  } = useTeamSelector();
  const pathname = usePathname();
  const router = useRouter();

  // Extract language from pathname (e.g., "/en/plan/settings/teams" -> "en")
  const getLanguageFromPath = React.useCallback((): string => {
    const segments = pathname.split('/').filter(Boolean);
    // First segment should be the language code
    return segments[0] || 'en'; // Default to 'en' if no language found
  }, [pathname]);

  // Check if we're on specific pages that don't require team selection
  const isTeamsPage = pathname.includes('/plan/settings/teams');
  const isProfilePage = pathname.includes('/plan/settings/profile');
  const isPersonalInfoPage = pathname.includes('/plan/settings/personal-info');
  const isSecurityPage = pathname.includes('/plan/settings/security');
  const isNotificationsPage = pathname.includes('/plan/notifications');
  const isAdminPage = pathname.includes('/admin');

  React.useEffect(() => {
    // Redirect when loading is done and no valid team is resolved.
    // This covers: no team id at all, invalid team id string, and a valid-looking
    // id that doesn't match any of the user's teams.
    if (
      !loading &&
      !selectedTeam &&
      !isTeamsPage &&
      !isProfilePage &&
      !isPersonalInfoPage &&
      !isSecurityPage &&
      !isNotificationsPage &&
      !isAdminPage
    ) {
      const language = getLanguageFromPath();

      // Clear any stale team id from storage to avoid redirect loops
      localStorage.removeItem('selectedTeamId');

      // Construct the teams page URL with the current language
      const teamsUrl = `/${language}/plan/settings/teams`;

      router.replace(teamsUrl);
    }
  }, [
    selectedTeam,
    isTeamsPage,
    isProfilePage,
    isPersonalInfoPage,
    isSecurityPage,
    isNotificationsPage,
    isAdminPage,
    router,
    loading,
    pathname,
    getLanguageFromPath,
  ]);

  return (
    <TeamContext.Provider
      value={{
        teams,
        selectedTeam,
        selectedTeamId,
        setSelectedTeamId,
        loading,
        updateTeamInContext,
        addTeamToContext,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
