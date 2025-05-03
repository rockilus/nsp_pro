"use client";

// Components
import TeamGeneralTab from "../../../../../../../components/teams-settings/general/team-general-tab";
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
  return (
    <div className="page-layout">
      <TeamGeneralTab lng={lng} teamId={teamId} />
    </div>
  );
}
