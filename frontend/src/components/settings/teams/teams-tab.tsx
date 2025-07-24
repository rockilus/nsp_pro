import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import TeamsList from "./teams-list";
import NewTeamDialog from "./new-team-dialog";
import UserTeamInvitationsList from "./user-team-invitations-list";
// Skeletons
// Actions
import {
  useCreateTeam,
  useGetUserTeamsWithMemberships,
  useLeaveTeam,
} from "@/hooks/useTeam";
import {
  useGetUserPendingInvitations,
  useAcceptTeamInvitation,
  useRejectTeamInvitation,
} from "@/hooks/useTeamInvitation";
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

  // Hook functions
  const createTeamFn = useCreateTeam();
  const getUserTeamsWithMembershipsFn = useGetUserTeamsWithMemberships();
  const leaveTeamFn = useLeaveTeam();
  const getUserPendingInvitationsFn = useGetUserPendingInvitations();
  const acceptTeamInvitationFn = useAcceptTeamInvitation();
  const rejectTeamInvitationFn = useRejectTeamInvitation();

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleCreateTeam = async (teamName: string) => {
    const newTeam = await createTeamFn(teamName);
    setTeams((prevTeams) => [...prevTeams, newTeam]);
  };

  const handleLeaveTeam = async (teamId: string) => {
    try {
      await leaveTeamFn(teamId);
      // If we get here, the leave operation was successful
      setTeams((prevTeams) =>
        prevTeams.filter((team) => team.team.id !== teamId)
      );
    } catch (error) {
      console.error("Failed to leave team:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  //////////////////////////
  // Invitation Actions
  //////////////////////////

  const handleAcceptInvitation = async (token: string) => {
    try {
      const newTeam = await acceptTeamInvitationFn(token);
      setTeams((prevTeams) => [...prevTeams, newTeam]);
      setInvitations((prevInvitations) =>
        prevInvitations.filter((invitation) => invitation.token !== token)
      );
    } catch (error) {
      console.error("Failed to accept team invitation:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  const handleRejectInvitation = async (token: string) => {
    try {
      await rejectTeamInvitationFn(token);
      setInvitations((prevInvitations) =>
        prevInvitations.filter((invitation) => invitation.token !== token)
      );
    } catch (error) {
      console.error("Failed to reject team invitation:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const teams = await getUserTeamsWithMembershipsFn();
        const invitations = await getUserPendingInvitationsFn();
        setTeams(teams);
        setInvitations(invitations);
      } catch (error) {
        console.error("Failed to fetch teams and invitations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [getUserTeamsWithMembershipsFn, getUserPendingInvitationsFn]);

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
