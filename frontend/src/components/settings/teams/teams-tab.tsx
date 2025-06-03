import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import TeamsList from "./teams-list";
import NewTeamDialog from "./new-team-dialog";
import UserTeamInvitationsList from "./user-team-invitations-list";
// Skeletons
// Actions
import {
  createTeam,
  getUserTeamsWithMemberships,
  leaveTeam,
} from "@/app/lib/team";
import {
  getUserPendingInvitations,
  acceptTeamInvitation,
  rejectTeamInvitation,
} from "@/app/lib/team-invitation";
// Styles
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
import "./teams-tab.css";
// Types
import { TeamWithMembership } from "@/types/team";
import { EnrichedTeamInvitationT } from "@/types/team-invitation";

export default function TeamsTab({
  lng,
  teamId,
}: {
  lng: string;
  teamId: string | null;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [invitations, setInvitations] = useState<EnrichedTeamInvitationT[]>([]);

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleCreateTeam = async (teamName: string) => {
    const newTeam = await createTeam(teamName);
    setTeams((prevTeams) => [...prevTeams, newTeam]);
  };

  const handleGetUserTeams = async () => {
    setIsLoading(true);
    const teams = await getUserTeamsWithMemberships();
    const invitations = await getUserPendingInvitations();
    setTeams(teams);
    setInvitations(invitations);
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

  //////////////////////////
  // Invitation Actions
  //////////////////////////

  const handleAcceptInvitation = async (token: string) => {
    const newTeam = await acceptTeamInvitation(token);
    setTeams((prevTeams) => [...prevTeams, newTeam]);
    setInvitations((prevInvitations) =>
      prevInvitations.filter((invitation) => invitation.token !== token)
    );
  };

  const handleRejectInvitation = async (token: string) => {
    const success = await rejectTeamInvitation(token);
    if (success) {
      setInvitations((prevInvitations) =>
        prevInvitations.filter((invitation) => invitation.token !== token)
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
      {!isLoading && (
        <div>
          {teams.length > 0 ? (
            <TeamsList
              lng={lng}
              teamId={teamId}
              teams={teams}
              handleLeaveTeam={handleLeaveTeam}
            />
          ) : (
            <div>{t("no_team_message")}</div>
          )}
          {invitations.length > 0 && (
            <div className="invitations-container">
              <span className="subtitle">{t("invitations")}</span>
              <UserTeamInvitationsList
                lng={lng}
                invitations={invitations}
                handleAcceptInvitation={handleAcceptInvitation}
                handleRejectInvitation={handleRejectInvitation}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
