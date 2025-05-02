import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
// Skeletons
// Actions
// Styles
import "./teams-list.css";
// Types
import { TeamWithMembership } from "@/types/team";

export default function TeamsList({
  lng,
  teams,
}: {
  lng: string;
  teams: TeamWithMembership[];
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
            <a href={`/${lng}/plan/teams/${teamWithMembership.team.id}`}>
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
          <Button
            variant="outlined"
            color="error"
            sx={{
              textTransform: "none",
              fontSize: "12px",
              padding: "3px 12px",
            }}
          >
            {t("leave")}
          </Button>
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
