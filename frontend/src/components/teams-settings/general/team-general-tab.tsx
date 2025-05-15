import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import EditIcon from "@mui/icons-material/Edit";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
// Components
import UserProfileRow from "@/components/settings/profile/user-profile-row";
// Skeletons
import TablesSkeleton from "../../skeletons/tables-skeleton";
// Actions
import { getTeamById, updateTeamById } from "@/app/lib/team";
// Styles
import "./team-general-tab.css";
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
// Types
import { TeamT } from "@/types/team";

export default function TeamGeneralTab({
  lng,
  teamId,
}: {
  lng: string;
  teamId: string;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [isLoading, setIsLoading] = useState(true);
  const [team, setTeam] = useState<TeamT | null>(null);
  const [fieldEditing, setFieldEditing] = useState<string | null>(null);
  const [teamState, setTeamState] = useState<TeamT | null>(team);

  const editButton = (handleSetEditing: () => void): ReactElement => (
    <IconButton onClick={handleSetEditing}>
      <EditIcon />
    </IconButton>
  );

  //////////////////////////
  // Team Actions
  //////////////////////////

  const handleGetTeam = async () => {
    setIsLoading(true);
    const fetchedTeam = await getTeamById(teamId);
    setTeam(fetchedTeam);
    setIsLoading(false);
  };

  const handleUpdateTeam = async (updatedTeam: TeamT) => {
    const newTeam = await updateTeamById(teamId, updatedTeam);
    setTeam(newTeam);
  };

  const handleEditConfirm = () => {
    if (teamState && team) {
      const userKeys = Object.keys(team);
      for (let key of userKeys) {
        if (
          team[key as keyof typeof team] !==
          teamState[key as keyof typeof teamState]
        ) {
          handleUpdateTeam(teamState);
          break;
        }
      }
    }
    setFieldEditing(null);
  };

  const handleEditCancel = () => {
    console.log("handleEditCancel");

    setTeamState(team);
    setFieldEditing(null);
  };

  useEffect(() => {
    handleGetTeam();
  }, []);

  useEffect(() => {
    if (team) {
      setTeamState(team);
    }
  }, [team]);

  return (
    <div className="tab-container-wide">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : (
        <div className="team-general-container">
          <div>
            <span className="title">{t("general")}</span>
          </div>
          {team && teamState ? (
            <div className="team-general-content">
              <UserProfileRow
                label={t("name")}
                value={<span>{team.name}</span>}
                valueEditing={
                  <TextField
                    fullWidth
                    type="text"
                    name="name"
                    value={teamState.name}
                    onChange={(e) => {
                      setTeamState({
                        ...teamState,
                        name: e.target.value,
                      });
                    }}
                    onBlur={handleEditConfirm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleEditConfirm();
                      } else if (e.key === "Escape") {
                        handleEditCancel();
                      }
                    }}
                    autoFocus
                  />
                }
                editing={fieldEditing === "name"}
                editButton={editButton(() => setFieldEditing("name"))}
                handleEditConfirm={handleEditConfirm}
                handleEditCancel={handleEditCancel}
              />
            </div>
          ) : (
            <Box sx={{ padding: 2 }}>{t("no_team_message")}</Box>
          )}
        </div>
      )}
    </div>
  );
}
