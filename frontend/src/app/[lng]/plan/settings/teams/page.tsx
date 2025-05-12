"use client";

// Components
import TeamsTab from "../../../../../components/settings/teams/teams-tab";
// Context
import { useTeam } from "@/context/TeamContext";
import { useUser } from "@/context/UserContext";
// Styles
import "../../../../../styles/page.css";

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
      <TeamsTab lng={lng} teamId={selectedTeam?.team.id || null} />
    </div>
  );
}
