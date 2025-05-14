"use client";

import { createContext, useContext } from "react";
import { TeamWithMembership } from "@/types/team";

type TeamContextType = {
  teams: TeamWithMembership[];
  selectedTeam: TeamWithMembership | null;
  setSelectedTeamId: (teamId: string) => void;
  loading: boolean; // Indicates if the team context is loading
};

export const TeamContext = createContext<TeamContextType | undefined>(
  undefined
);

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within a TeamProvider");
  return ctx;
}

// "use client";

// import { createContext, useContext } from "react";
// import { TeamWithMembership } from "@/types/team";

// type TeamContextType = {
//   selectedTeam: TeamWithMembership | null;
//   setSelectedTeamId: (id: string) => void;
// };

// export const TeamContext = createContext<TeamContextType | undefined>(
//   undefined
// );
