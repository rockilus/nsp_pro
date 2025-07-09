import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../app/i18n/client";
// Context
import { useTeam } from "@/context/TeamContext";
// MUI
import Button from "@mui/material/Button";
// Components
import LeaveTeamDialog from "./leave-team-dialog";
// Styles
import "./teams-list.css";
// Types
import { TeamWithMembership, TeamMembershipRole } from "@/types/team";

export default function TeamsList({
  lng,
  teamId,
  teams,
  handleLeaveTeam,
}: {
  lng: string;
  teamId: string | null;
  teams: TeamWithMembership[];
  handleLeaveTeam: (teamId: string) => void;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const router = useRouter();
  const { setSelectedTeamId } = useTeam();

  const TeamsListItem = ({
    teamWithMembership,
    isFirstItem,
  }: {
    teamWithMembership: TeamWithMembership;
    isFirstItem?: boolean;
  }) => {
    const handleTeamClick = () => {
      setSelectedTeamId(teamWithMembership.team.id);
      router.push(`/${lng}/plan/schedule`);
    };

    return (
      <div
        key={teamWithMembership.team.id}
        className={`teams-list-item ${
          teamWithMembership.team.id === teamId ? "active" : ""
        } ${isFirstItem ? "first-item" : ""}`}
      >
        <div className="team-list-item-description">
          <strong className="teams-list-item-name" onClick={handleTeamClick}>
            {teamWithMembership.team.name}
          </strong>
          <span className="teams-list-item-role">
            {teamWithMembership.membership.role.valueOf()}
          </span>
        </div>
        <div className="team-list-item-actions">
          <Button
            variant="outlined"
            disabled={
              teamWithMembership.membership.role !== TeamMembershipRole.OWNER
            }
            onClick={() => {
              setSelectedTeamId(teamWithMembership.team.id);
              router.push(`/${lng}/plan/settings/teams/general`);
            }}
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
