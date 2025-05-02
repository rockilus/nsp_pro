"use client";

import React, { useEffect, useState } from "react";
import { TeamContext } from "./TeamContext";
import { useTeamSelector } from "@/hooks/useTeamSelector";
import { TeamWithMembership } from "@/types/team";
import { TeamSelector } from "../components/teams/TeamSelector";
import { getUserTeamsWithMemberships } from "@/app/lib/team";

export function TeamProvider({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { teams, selectedTeam, setSelectedTeamId } = useTeamSelector();

  // if (!teams.length) {
  //   return <div>You are not part of any teams.</div>;
  // }

  // if (!selectedTeam) {
  //   return (
  //     <TeamContext.Provider
  //       value={{ teams, selectedTeam: null, setSelectedTeamId }}
  //     >
  //       {fallback ?? (
  //         <div className="p-4">
  //           <h2>Please select a team to continue</h2>
  //           <TeamSelector
  //             teams={teams}
  //             // onSelect={setSelectedTeamId}
  //           />
  //         </div>
  //       )}
  //     </TeamContext.Provider>
  //   );
  // }

  return (
    <TeamContext.Provider value={{ teams, selectedTeam, setSelectedTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}
