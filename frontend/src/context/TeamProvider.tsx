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
  const { teams, selectedTeam, setSelectedTeamId } = useTeamSelector();
  const pathname = usePathname();
  const isTeamsPage = pathname.endsWith("/plan/settings/teams");
  const isProfilePage = pathname.endsWith("/plan/settings/profile");
  const router = useRouter();

  React.useEffect(() => {
    if (!selectedTeam && !isTeamsPage && !isProfilePage) {
      router.replace("/plan/settings/teams");
    }
  }, [selectedTeam, isTeamsPage, isProfilePage, router]);

  // if (!teams.length) {
  //   return <div>You are not part of any teams.</div>;
  // }

  return (
    <TeamContext.Provider value={{ teams, selectedTeam, setSelectedTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}
