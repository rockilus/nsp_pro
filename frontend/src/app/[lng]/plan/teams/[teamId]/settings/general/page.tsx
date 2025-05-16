"use client";

// Components
import TeamGeneralTab from "../../../../../../../components/teams-settings/general/team-general-tab";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../../../../styles/page.css";

export default function Page({
  params: { lng, teamId },
}: {
  params: {
    lng: string;
    teamId: string;
  };
}) {
  const { selectedTeam } = useTeam();

  return (
    <div className="page-layout">
      <TeamGeneralTab
        lng={lng}
        teamId={teamId}
        selectedTeamId={selectedTeam?.team.id || null}
      />
    </div>
  );
}
