import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Button from "@mui/material/Button";
// Components
import TeamsList from "./teams-list";
// Skeletons
// Actions
import { getUserTeamsWithMemberships } from "@/app/lib/team";
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
  // User Actions
  //////////////////////////

  const handleGetUserTeams = async () => {
    setIsLoading(true);
    const teams = await getUserTeamsWithMemberships();
    setTeams(teams);
    setIsLoading(false);
  };

  useEffect(() => {
    handleGetUserTeams();
  }, []);

  return (
    <div className="tab-container-wide">
      <div className="teams-tab-header">
        <span className="title">{t("teams")}</span>
        <Button
          variant="contained"
          //   onClick={() => handleGetUserTeams()}
          //   className="refresh-button"
          sx={{
            textTransform: "none",
            fontSize: "12px",
            padding: "3px 12px",
          }}
        >
          {t("new_team")}
        </Button>
      </div>
      {!isLoading &&
        (teams.length > 0 ? (
          <TeamsList lng={lng} teams={teams} />
        ) : (
          <div>{t("no_team_message")}</div>
        ))}
    </div>
  );
}
