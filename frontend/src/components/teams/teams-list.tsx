import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import LeaveTeamDialog from "./leave-team-dialog";
// Styles
import "./teams-list.css";
// Types
import { TeamWithMembership } from "@/types/team";

export default function TeamsList({
  lng,
  teams,
  handleLeaveTeam,
}: {
  lng: string;
  teams: TeamWithMembership[];
  handleLeaveTeam: (teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const TeamsListItem = ({
    teamWithMembership,
    isFirstItem,
  }: {
    teamWithMembership: TeamWithMembership;
    isFirstItem?: boolean;
  }) => {
    return (
      <div
        key={teamWithMembership.team.id}
        className={`teams-list-item ${isFirstItem ? "first-item" : ""}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name">
            <a
            // href={`/${lng}/plan/teams/${teamWithMembership.team.id}`}
            >
              {teamWithMembership.team.name}
            </a>
          </strong>
          {teamWithMembership.membership.roles.map((role, index) => (
            <span
              key={`${teamWithMembership.team.id}-${role}-${index}`}
              className="teams-list-item-role"
            >
              {role.valueOf()}
            </span>
          ))}
        </div>
        <div className="team-list-item-actions">
          <Button
            variant="outlined"
            sx={{
              textTransform: "none",
              marginRight: "8px",
              fontSize: "12px",
              padding: "3px 12px",
            }}
          >
            {t("settings")}
          </Button>
          <LeaveTeamDialog
            lng={lng}
            teamWithMembership={teamWithMembership}
            handleLeaveTeam={handleLeaveTeam}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="teams-list-container">
      {teams.map((teamWithMembership, index) => (
        <TeamsListItem
          key={teamWithMembership.team.id}
          teamWithMembership={teamWithMembership}
          isFirstItem={index === 0}
        />
      ))}
    </div>
  );
}
