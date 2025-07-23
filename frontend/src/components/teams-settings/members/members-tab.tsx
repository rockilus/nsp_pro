import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import MembersList from "./members-list";
import AddMemberDialog from "./add-member-dialog";
import InvitationsList from "./invitations-list";
// Skeletons
// Actions
import {
  useGetTeamUsersWithMemberships,
  useRemoveUserFromTeam,
} from "@/hooks/useTeam";
import { getWorkers, attachUserToWorker } from "@/app/lib/worker";
import {
  useCreateTeamInvitation,
  useGetTeamInvitations,
  useResendTeamInvitationEmail,
  useDeleteTeamInvitation,
} from "@/hooks/useTeamInvitation";
// Styles
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
import "./members-tab.css";
// Types
import { UserWithMembership } from "@/types/user";
import { WorkerT } from "@/types/worker";
import { TeamInvitationT } from "@/types/team-invitation";

export default function MembersTab({
  lng,
  teamId,
}: {
  lng: string;
  teamId: string;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserWithMembership[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitationT[]>([]);

  // Hook functions
  const getTeamUsersWithMembershipsFn = useGetTeamUsersWithMemberships();
  const removeUserFromTeamFn = useRemoveUserFromTeam();
  const createTeamInvitationFn = useCreateTeamInvitation();
  const getTeamInvitationsFn = useGetTeamInvitations();
  const resendTeamInvitationEmailFn = useResendTeamInvitationEmail();
  const deleteTeamInvitationFn = useDeleteTeamInvitation();

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleGetTeamUsersInvitationsAndWorkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await getTeamUsersWithMembershipsFn(teamId);
      const workers = await getWorkers(teamId);
      const invitations = await getTeamInvitationsFn(teamId);
      setUsers(users);
      setWorkers(workers);
      setInvitations(invitations);
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, getTeamUsersWithMembershipsFn, getTeamInvitationsFn]);

  const handleRemoveFromTeam = async (teamId: string, userId: string) => {
    try {
      await removeUserFromTeamFn(teamId, userId);
      // If we get here, the removal was successful
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.user.id !== userId)
      );
    } catch (error) {
      console.error("Failed to remove user from team:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  //////////////////////////
  // Worker Actions
  //////////////////////////

  const handleAttachUserToWorker = async (
    workerId: string,
    userId: string,
    teamId: string
  ) => {
    const updatedWorkers = await attachUserToWorker(workerId, userId, teamId);
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) =>
        worker.id === updatedWorkers.id ? updatedWorkers : worker
      )
    );
  };

  //////////////////////////
  // Team Invitation Actions
  //////////////////////////

  const handleCreateTeamInvitation = async (invitation: TeamInvitationT) => {
    try {
      const newInvitation = await createTeamInvitationFn(invitation, teamId);
      setInvitations((prevInvitations) => [...prevInvitations, newInvitation]);
    } catch (error) {
      console.error("Failed to create team invitation:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  const handleResendTeamInvitationEmail = async (invitationId: string) => {
    try {
      const newInvitation = await resendTeamInvitationEmailFn(
        invitationId,
        teamId
      );
      setInvitations((prevInvitations) =>
        prevInvitations.map((invitation) =>
          invitation.id === newInvitation.id ? newInvitation : invitation
        )
      );
    } catch (error) {
      console.error("Failed to resend team invitation email:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  const handleDeleteTeamInvitation = async (invitationId: string) => {
    try {
      await deleteTeamInvitationFn(invitationId, teamId);
      setInvitations((prevInvitations) =>
        prevInvitations.filter((invitation) => invitation.id !== invitationId)
      );
    } catch (error) {
      console.error("Failed to delete team invitation:", error);
      // Handle error as needed (show notification, etc.)
    }
  };

  useEffect(() => {
    handleGetTeamUsersInvitationsAndWorkers();
  }, [handleGetTeamUsersInvitationsAndWorkers]);

  return (
    <div className="tab-container-wide">
      <div className="members-tab-header">
        <span className="title">{t("members")}</span>
        <AddMemberDialog
          lng={lng}
          teamId={teamId}
          workers={workers}
          handleCreateTeamInvitation={handleCreateTeamInvitation}
        />
      </div>
      {!isLoading && (
        <div>
          {users.length > 0 ? (
            <MembersList
              lng={lng}
              teamId={teamId}
              users={users}
              workers={workers}
              handleRemoveFromTeam={handleRemoveFromTeam}
              handleAttachUserToWorker={handleAttachUserToWorker}
            />
          ) : (
            <div>{t("no_member_message")}</div>
          )}
          {invitations.length > 0 && (
            <div className="invitations-container">
              <span className="subtitle">{t("invitations")}</span>
              <InvitationsList
                lng={lng}
                invitations={invitations}
                workers={workers}
                handleResendTeamInvitationEmail={
                  handleResendTeamInvitationEmail
                }
                handleDeleteTeamInvitation={handleDeleteTeamInvitation}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
