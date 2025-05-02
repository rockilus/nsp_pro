"use client";

import { useTeam } from "@/context/TeamContext";
import { TeamWithMembership } from "@/types/team";

export function TeamSelector({ teams }: { teams: TeamWithMembership[] }) {
  const { setSelectedTeamId, selectedTeam } = useTeam();

  return (
    <div>
      <label>Select a team:</label>
      <select
        value={selectedTeam?.team.id ?? ""}
        onChange={(e) => setSelectedTeamId(e.target.value)}
      >
        {teams.map((t) => (
          <option key={t.team.id} value={t.team.id}>
            {t.team.name}
          </option>
        ))}
      </select>
    </div>
  );
}
