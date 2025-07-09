"use client";

// Components
import MembersTab from "../../../../../../components/teams-settings/members/members-tab";
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

  // Don't render if no team is selected
  if (!selectedTeam) {
    return null;
  }

  return (
    <div className="page-layout">
      <MembersTab lng={lng} teamId={selectedTeam.team.id} />
    </div>
  );
}
