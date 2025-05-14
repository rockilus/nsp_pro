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
  const { teams, selectedTeam, setSelectedTeamId, loading } = useTeamSelector();
  const pathname = usePathname();
  const isTeamsPage = pathname.endsWith("/plan/settings/teams");
  const isProfilePage = pathname.endsWith("/plan/settings/profile");
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !selectedTeam && !isTeamsPage && !isProfilePage) {
      router.replace("/plan/settings/teams");
    }
  }, [selectedTeam, isTeamsPage, isProfilePage, router, loading]);

  return (
    <TeamContext.Provider
      value={{ teams, selectedTeam, setSelectedTeamId, loading }}
    >
      {children}
    </TeamContext.Provider>
  );
}
