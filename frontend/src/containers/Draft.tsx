import React, { useEffect, useState } from "react";
// Components
import Dashboard from "../components/Dashboard/Dashboard";
// Stores
import { useTeamStore } from "../stores/teamStore";
// Types
import { TeamT } from "./types";

export default function Draft() {
  // const [selectedTeam, setSelectedTeam] = useState<TeamT | null>(null);
  const teams = useTeamStore((state) => state.teams);
  const selectedTeam = useTeamStore((state) => state.selectedTeam);
  const fetchTeams = useTeamStore((state) => state.fetchTeams);
  const setSelectedTeam = useTeamStore((state) => state.setSelectedTeam);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    }
  }, [fetchTeams, teams]);

  useEffect(() => {
    if (teams.length > 0) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, setSelectedTeam]);

  // console.log("teams", teams);

  return selectedTeam && <Dashboard team={selectedTeam} />;
}
