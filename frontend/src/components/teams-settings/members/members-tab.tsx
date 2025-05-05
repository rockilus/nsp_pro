import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import MembersList from "./members-list";
import AddMemberDialog from "./add-member-dialog";
import InvitationsList from "./invitations-list";
// Skeletons
// Actions
import {
  getTeamUsersWithMemberships,
  removeUserFromTeam,
} from "@/app/lib/team";
import { getWorkers, attachUserToWorker } from "@/app/lib/worker";
import {
  createTeamInvitation,
  getTeamInvitations,
  resendTeamInvitationEmail,
  deleteTeamInvitation,
} from "@/app/lib/team-invitation";
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

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleGetTeamUsersInvitationsAndWorkers = async () => {
    setIsLoading(true);
    const users = await getTeamUsersWithMemberships(teamId);
    const workers = await getWorkers(teamId);
    const invitations = await getTeamInvitations(teamId);
    setUsers(users);
    setWorkers(workers);
    setInvitations(invitations);
    setIsLoading(false);
  };

  const handleRemoveFromTeam = async (teamId: string, userId: string) => {
    const success = await removeUserFromTeam(teamId, userId);
    if (success) {
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.user.id !== userId)
      );
    }
  };

  const handleCreateTeam = async (teamName: string) => {
    console.log("Creating team:", teamName);
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
    const newInvitation = await createTeamInvitation(invitation);
    setInvitations((prevInvitations) => [...prevInvitations, newInvitation]);
  };

  const handleResendTeamInvitationEmail = async (invitationId: string) => {
    const newInvitation = await resendTeamInvitationEmail(invitationId);
    setInvitations((prevInvitations) =>
      prevInvitations.map((invitation) =>
        invitation.id === newInvitation.id ? newInvitation : invitation
      )
    );
  };

  const handleDeleteTeamInvitation = async (invitationId: string) => {
    const success = await deleteTeamInvitation(invitationId);
    if (success) {
      setInvitations((prevInvitations) =>
        prevInvitations.filter((invitation) => invitation.id !== invitationId)
      );
    }
  };

  useEffect(() => {
    handleGetTeamUsersInvitationsAndWorkers();
  }, []);

  return (
    <div className="tab-container-wide">
      <div className="members-tab-header">
        <span className="title">{t("members")}</span>
        <AddMemberDialog
          lng={lng}
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
            <InvitationsList
              lng={lng}
              invitations={invitations}
              workers={workers}
              handleResendTeamInvitationEmail={handleResendTeamInvitationEmail}
              handleDeleteTeamInvitation={handleDeleteTeamInvitation}
            />
          )}
        </div>
      )}
    </div>
  );
}
