import React from "react";
import Link from "next/link";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import RemoveFromTeamDialog from "./remove-from-team-dialog";
import EditWorkerPopover from "./edit-worker";
// Styles
import "./members-list.css";
// Types
import { UserWithMembership } from "@/types/user";
import { WorkerT } from "@/types/worker";

export default function MembersList({
  lng,
  teamId,
  users,
  workers,
  handleRemoveFromTeam,
  handleAttachUserToWorker,
}: {
  lng: string;
  teamId: string;
  users: UserWithMembership[];
  workers: WorkerT[];
  handleRemoveFromTeam: (teamId: string, userId: string) => void;
  handleAttachUserToWorker: (
    workerId: string,
    userId: string,
    teamId: string
  ) => Promise<void>;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const MembersListItem = ({
    userWithMembership,
    isFirstItem,
  }: {
    userWithMembership: UserWithMembership;
    isFirstItem?: boolean;
  }) => {
    const displayName =
      userWithMembership.user.firstName || userWithMembership.user.lastName
        ? `${userWithMembership.user.firstName} ${userWithMembership.user.lastName}`
        : userWithMembership.user.email;

    return (
      <div
        key={userWithMembership.user.id}
        className={`teams-list-item ${isFirstItem ? "first-item" : ""}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name">
            <a
            // href={`/${lng}/plan/teams/${teamWithMembership.team.id}`}
            >
              {displayName}
            </a>
          </strong>
          <span className="teams-list-item-role">
            {userWithMembership.membership.role.valueOf()}
          </span>
        </div>
        <div className="members-list-item-actions">
          <EditWorkerPopover
            lng={lng}
            teamId={teamId}
            userId={userWithMembership.user.id}
            workers={workers}
            handleAttachUserToWorker={handleAttachUserToWorker}
          />
          <RemoveFromTeamDialog
            lng={lng}
            teamId={teamId}
            userWithMembership={userWithMembership}
            handleRemoveFromTeam={handleRemoveFromTeam}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="teams-list-container">
      {users.map((teamWithMembership, index) => (
        <MembersListItem
          key={teamWithMembership.user.id}
          userWithMembership={teamWithMembership}
          isFirstItem={index === 0}
        />
      ))}
    </div>
  );
}
