"use client";

// Components
import ShiftTab from "../../../../components/shifts/shift-tab";
// Context
import { useTeam } from "@/context/TeamContext";
// Styles
import "../../../../styles/page.css";

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
      <ShiftTab lng={lng} selectedTeamId={selectedTeam?.team.id || null} />
    </div>
  );
}
