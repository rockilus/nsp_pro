import React from "react";
import Link from "next/link";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
// import LeaveTeamDialog from "./leave-team-dialog";
// Styles
import "./teams-list.css";
// Types
import { UserWithMembership } from "@/types/user";

export default function MembersList({
  lng,
  users,
}: // handleLeaveTeam,
{
  lng: string;
  users: UserWithMembership[];
  // handleLeaveTeam: (teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const MembersListItem = ({
    userWithMembership,
    isFirstItem,
  }: {
    userWithMembership: UserWithMembership;
    isFirstItem?: boolean;
  }) => {
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
              {userWithMembership.user.firstName}
            </a>
          </strong>
          {userWithMembership.membership.roles.map((role, index) => (
            <span
              key={`${userWithMembership.user.id}-${role}-${index}`}
              className="teams-list-item-role"
            >
              {role.valueOf()}
            </span>
          ))}
        </div>
        <div className="team-list-item-actions">
          <Button
            variant="outlined"
            component={Link}
            href={`/${lng}/plan/teams/${userWithMembership.user.id}/settings/general`}
            sx={{
              textTransform: "none",
              marginRight: "8px",
              fontSize: "12px",
              padding: "3px 12px",
            }}
          >
            {t("settings")}
          </Button>
          {/* <LeaveTeamDialog
            lng={lng}
            teamWithMembership={userWithMembership}
            handleLeaveTeam={handleLeaveTeam}
          /> */}
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
