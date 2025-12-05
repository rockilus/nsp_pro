"use client";

import React from "react";
import { TeamContext } from "./TeamContext";
import { useTeamSelector } from "@/hooks/useTeamSelector";
import { usePathname, useRouter } from "next/navigation";

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
    setSelectedTeamId,
    loading,
    updateTeamInContext,
  } = useTeamSelector();
  const pathname = usePathname();
  const router = useRouter();

  // Extract language from pathname (e.g., "/en/plan/settings/teams" -> "en")
  const getLanguageFromPath = React.useCallback((): string => {
    const segments = pathname.split("/").filter(Boolean);
    // First segment should be the language code
    return segments[0] || "en"; // Default to 'en' if no language found
  }, [pathname]);

  // Check if we're on specific pages that don't require team selection
  const isTeamsPage = pathname.includes("/plan/settings/teams");
  const isProfilePage = pathname.includes("/plan/settings/profile");
  const isPersonalInfoPage = pathname.includes("/plan/settings/personal-info");
  const isSecurityPage = pathname.includes("/plan/settings/security");

  React.useEffect(() => {
    // Security: Only redirect authenticated users when necessary
    if (
      !loading &&
      !selectedTeam &&
      !isTeamsPage &&
      !isProfilePage &&
      !isPersonalInfoPage &&
      !isSecurityPage
    ) {
      const language = getLanguageFromPath();

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
        setSelectedTeamId,
        loading,
        updateTeamInContext,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
