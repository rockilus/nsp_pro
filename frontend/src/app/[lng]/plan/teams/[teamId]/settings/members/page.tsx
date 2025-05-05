"use client";

// Components
import MembersTab from "../../../../../../../components/teams-settings/members/members-tab";
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
      <MembersTab lng={lng} teamId={teamId} />
    </div>
  );
}
