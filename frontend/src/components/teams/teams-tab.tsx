import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// Components
import TeamsList from "./teams-list";
import NewTeamDialog from "./new-team-dialog";
// Skeletons
// Actions
import {
  createTeam,
  getUserTeamsWithMemberships,
  leaveTeam,
} from "@/app/lib/team";
// Styles
import "../../styles/text-styles.css";
import "../../styles/tab-container-styles.css";
import "./teams-tab.css";
// Types
import { TeamWithMembership } from "@/types/team";

export default function TeamsTab({ lng }: { lng: string }) {
  const { t } = useTranslation(lng, "teams-page");

  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleCreateTeam = async (teamName: string) => {
    const newTeam = await createTeam(teamName);
  };

  const handleGetUserTeams = async () => {
    setIsLoading(true);
    const teams = await getUserTeamsWithMemberships();
    setTeams(teams);
    setIsLoading(false);
  };

  const handleLeaveTeam = async (teamId: string) => {
    const success = await leaveTeam(teamId);
    if (success) {
      setTeams((prevTeams) =>
        prevTeams.filter((team) => team.team.id !== teamId)
      );
    }
  };

  useEffect(() => {
    handleGetUserTeams();
  }, []);

  return (
    <div className="tab-container-wide">
      <div className="teams-tab-header">
        <span className="title">{t("teams")}</span>
        <NewTeamDialog lng={lng} handleCreateTeam={handleCreateTeam} />
      </div>
      {!isLoading &&
        (teams.length > 0 ? (
          <TeamsList
            lng={lng}
            teams={teams}
            handleLeaveTeam={handleLeaveTeam}
          />
        ) : (
          <div>{t("no_team_message")}</div>
        ))}
    </div>
  );
}
