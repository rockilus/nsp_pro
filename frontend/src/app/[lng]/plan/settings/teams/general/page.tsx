"use client";

// Components
import TeamGeneralTab from "../../../../../../components/teams-settings/general/team-general-tab";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../../../styles/page.css";

export default function Page({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  const { selectedTeam } = useTeam();

  return (
    <div className="page-layout">
      <TeamGeneralTab
        lng={lng}
        selectedTeamId={selectedTeam?.team.id || null}
      />
    </div>
  );
}
